import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { OKXFacilitatorClient, type OKXConfig } from "@okxweb3/x402-core";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import {
  paymentMiddlewareFromHTTPServer,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@okxweb3/x402-hono";
import { Hono, type Context, type MiddlewareHandler, type Next } from "hono";
import { cors } from "hono/cors";
import * as z from "zod/v4";
import {
  ASSESSMENT_VERSION,
  SESSION_SIZE,
  drawAssessmentQuestions,
  scoreAssessmentAnswers,
  toPublicQuestion,
  type AssessmentAnswerInput,
} from "./lib/assessment";
import { allDimensions, resultLevels } from "./data/questions";

const PAYMENT_NETWORK = "eip155:196";
const PAYMENT_SCHEME = "exact";
const PAYMENT_PRICE = "$0.05";
const PAYMENT_PRICE_LABEL = "0.05 USDT";
const PAYMENT_PAY_TO = "0xdbe72d90b4a2e99c90c9a11e284bac1ea71d227d";
const DRAW_TOOL_NAME = "ctbz_draw_questions";
const SCORE_TOOL_NAME = "ctbz_score_assessment";
const PAID_TOOL_NAMES = [DRAW_TOOL_NAME, SCORE_TOOL_NAME] as const;
const MCP_JSON_ACCEPT = "application/json";
const MCP_SSE_ACCEPT = "text/event-stream";

type PaidToolName = (typeof PAID_TOOL_NAMES)[number];

type WorkerBindings = {
  ASSETS: Fetcher;
  OKX_API_KEY?: string;
  OKX_SECRET_KEY?: string;
  OKX_PASSPHRASE?: string;
  OKX_BASE_URL?: string;
  OKX_SYNC_SETTLE?: string;
};

type AppEnv = {
  Bindings: WorkerBindings;
  Variables: {
    paidToolDecision: PaidToolDecision;
  };
};

type PaidToolDecision =
  | { kind: "free" }
  | { kind: "paid"; toolName: PaidToolName }
  | { kind: "invalid"; reason: string };

type PaymentConfigResult =
  | { kind: "ok"; config: OKXConfig; cacheKey: string }
  | { kind: "missing"; missing: string[] }
  | { kind: "invalid"; reason: string };

type PaymentRuntime = {
  cacheKey: string;
  httpServer: x402HTTPResourceServer;
  middleware: MiddlewareHandler<AppEnv>;
  initPromise?: Promise<void>;
};

const answerInputSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.enum(["A", "B", "C", "D"]),
});

const scoreToolInputSchema = z.object({
  answers: z.array(answerInputSchema).length(SESSION_SIZE),
});

let paymentRuntime: PaymentRuntime | undefined;

function createMcpServer() {
  const server = new McpServer({
    name: "ctbz-a2mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "ctbz_assessment_meta",
    {
      title: "草台班子检测元数据",
      description: "返回题库版本、题量、维度、结果等级和计费信息。",
    },
    async () => {
      const payload = {
        version: ASSESSMENT_VERSION,
        sessionSize: SESSION_SIZE,
        dimensions: allDimensions,
        resultLevels,
        freeTools: ["ctbz_assessment_meta"],
        paidTools: PAID_TOOL_NAMES,
        payment: {
          scheme: PAYMENT_SCHEME,
          network: PAYMENT_NETWORK,
          price: PAYMENT_PRICE_LABEL,
          payTo: PAYMENT_PAY_TO,
          facilitator: {
            requiredSecrets: ["OKX_API_KEY", "OKX_SECRET_KEY", "OKX_PASSPHRASE"],
            optionalVariables: ["OKX_BASE_URL", "OKX_SYNC_SETTLE"],
          },
        },
      };

      return toToolResult(payload);
    },
  );

  server.registerTool(
    DRAW_TOOL_NAME,
    {
      title: "抽取草台班子检测题",
      description: "付费抽取 20 道检测题，返回 Agent 可直接展示给用户的题目和选项。",
    },
    async () => {
      const questions = drawAssessmentQuestions().map(toPublicQuestion);
      const payload = {
        version: ASSESSMENT_VERSION,
        sessionSize: SESSION_SIZE,
        questions,
      };

      return toToolResult(payload);
    },
  );

  server.registerTool(
    SCORE_TOOL_NAME,
    {
      title: "草台班子 AI 评分",
      description: "付费评分工具。输入 20 个 questionId/optionId 答案，返回总分、等级、结论和维度分。",
      inputSchema: {
        answers: z.array(answerInputSchema).length(SESSION_SIZE),
      },
    },
    async ({ answers }) => {
      const result = scoreAssessmentAnswers(answers as AssessmentAnswerInput[]);
      const payload = {
        ...result,
        payment: {
          scheme: PAYMENT_SCHEME,
          network: PAYMENT_NETWORK,
          price: PAYMENT_PRICE_LABEL,
          payTo: PAYMENT_PAY_TO,
        },
      };

      return toToolResult(payload);
    },
  );

  return server;
}

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Accept",
      "Content-Type",
      "Last-Event-ID",
      "Mcp-Protocol-Version",
      "Mcp-Session-Id",
      "PAYMENT-REQUIRED",
      "PAYMENT-SIGNATURE",
      "X-PAYMENT",
      "payment-required",
      "payment-signature",
      "x-payment",
    ],
    exposeHeaders: [
      "Mcp-Protocol-Version",
      "Mcp-Session-Id",
      "PAYMENT-REQUIRED",
      "PAYMENT-RESPONSE",
      "payment-required",
      "payment-response",
    ],
  }),
);

app.use("*", validateOrigin);

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "ctbz-a2mcp",
    version: ASSESSMENT_VERSION,
    paidTools: PAID_TOOL_NAMES,
  }),
);

app.use("/mcp", async (c, next) => {
  const decision = await getPaidToolDecision(c.req.raw);
  c.set("paidToolDecision", decision);

  if (decision.kind === "free") {
    return next();
  }

  if (decision.kind === "invalid") {
    return c.json({ error: "invalid_paid_tool_request", reason: decision.reason }, 403);
  }

  const paymentConfig = getPaymentConfig(c.env);
  if (paymentConfig.kind === "missing") {
    return c.json(
      {
        error: "okx_facilitator_not_configured",
        missingSecrets: paymentConfig.missing,
        requiredSecrets: ["OKX_API_KEY", "OKX_SECRET_KEY", "OKX_PASSPHRASE"],
      },
      503,
    );
  }

  if (paymentConfig.kind === "invalid") {
    return c.json({ error: "okx_facilitator_config_invalid", reason: paymentConfig.reason }, 503);
  }

  const runtime = getPaymentRuntime(paymentConfig);
  try {
    await ensurePaymentServerInitialized(runtime);
  } catch (error) {
    return c.json(
      {
        error: "okx_facilitator_init_failed",
        reason: error instanceof Error ? error.message : "Unknown facilitator initialization error.",
      },
      502,
    );
  }

  return runtime.middleware(c, next);
});

app.all("/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createMcpServer();
  await server.connect(transport);
  return transport.handleRequest(withMcpCompatibleAccept(c.req.raw));
});

function getPaymentRuntime(paymentConfig: Extract<PaymentConfigResult, { kind: "ok" }>) {
  if (paymentRuntime?.cacheKey === paymentConfig.cacheKey) {
    return paymentRuntime;
  }

  const facilitatorClient = new OKXFacilitatorClient(paymentConfig.config);
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    PAYMENT_NETWORK,
    new ExactEvmScheme(),
  );
  const httpServer = new x402HTTPResourceServer(resourceServer, {
    "POST /mcp": {
      accepts: {
        scheme: PAYMENT_SCHEME,
        network: PAYMENT_NETWORK,
        payTo: PAYMENT_PAY_TO,
        price: PAYMENT_PRICE,
        maxTimeoutSeconds: 300,
      },
      resource: "mcp://ctbz/paid-tool-call",
      description: "Paid company reality-check question draw or AI scoring",
      mimeType: "application/json",
      unpaidResponseBody: (context) => {
        const decision = getHonoContext(context)?.get("paidToolDecision") ?? { kind: "free" };

        return {
          contentType: "application/json",
          body: {
            error: "payment_required",
            tool: decision.kind === "paid" ? decision.toolName : undefined,
            paidTools: PAID_TOOL_NAMES,
            price: PAYMENT_PRICE_LABEL,
            network: PAYMENT_NETWORK,
            payTo: PAYMENT_PAY_TO,
          },
        };
      },
    },
  }).onProtectedRequest(async (context) => {
    const honoContext = getHonoContext(context);
    const decision = honoContext?.get("paidToolDecision") ?? { kind: "free" };

    if (decision.kind === "free") {
      return { grantAccess: true };
    }

    if (decision.kind === "invalid") {
      return { abort: true, reason: decision.reason };
    }
  });

  paymentRuntime = {
    cacheKey: paymentConfig.cacheKey,
    httpServer,
    middleware: paymentMiddlewareFromHTTPServer(httpServer, undefined, undefined, false),
  };

  return paymentRuntime;
}

async function ensurePaymentServerInitialized(runtime: PaymentRuntime) {
  runtime.initPromise ??= runtime.httpServer.initialize();
  await runtime.initPromise;
}

function getPaymentConfig(env: WorkerBindings): PaymentConfigResult {
  const apiKey = env.OKX_API_KEY?.trim();
  const secretKey = env.OKX_SECRET_KEY?.trim();
  const passphrase = env.OKX_PASSPHRASE?.trim();
  const missing = [
    ["OKX_API_KEY", apiKey],
    ["OKX_SECRET_KEY", secretKey],
    ["OKX_PASSPHRASE", passphrase],
  ]
    .filter((entry): entry is [string, undefined] => !entry[1])
    .map(([name]) => name);

  if (missing.length > 0) {
    return { kind: "missing", missing };
  }

  if (!apiKey || !secretKey || !passphrase) {
    return {
      kind: "missing",
      missing: ["OKX_API_KEY", "OKX_SECRET_KEY", "OKX_PASSPHRASE"].filter((name) => {
        if (name === "OKX_API_KEY") {
          return !apiKey;
        }
        if (name === "OKX_SECRET_KEY") {
          return !secretKey;
        }
        return !passphrase;
      }),
    };
  }

  const syncSettleResult = parseOptionalBoolean("OKX_SYNC_SETTLE", env.OKX_SYNC_SETTLE);
  if (syncSettleResult.kind === "invalid") {
    return syncSettleResult;
  }

  const config: OKXConfig = {
    apiKey,
    secretKey,
    passphrase,
    baseUrl: env.OKX_BASE_URL?.trim() || "https://web3.okx.com",
  };

  if (syncSettleResult.value !== undefined) {
    config.syncSettle = syncSettleResult.value;
  }

  return {
    kind: "ok",
    config,
    cacheKey: JSON.stringify({
      apiKey,
      secretKey,
      passphrase,
      baseUrl: config.baseUrl,
      syncSettle: config.syncSettle,
    }),
  };
}

function parseOptionalBoolean(name: string, value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return { kind: "ok" as const, value: undefined };
  }

  if (normalized === "true") {
    return { kind: "ok" as const, value: true };
  }

  if (normalized === "false") {
    return { kind: "ok" as const, value: false };
  }

  return { kind: "invalid" as const, reason: `${name} must be true or false.` };
}

async function validateOrigin(c: Context<AppEnv>, next: Next) {
  const origin = c.req.header("origin");
  if (!origin) {
    return next();
  }

  try {
    const url = new URL(origin);
    const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol === "https:" || isLocalhost) {
      return next();
    }
  } catch {
    return c.json({ error: "invalid_origin" }, 403);
  }

  return c.json({ error: "invalid_origin" }, 403);
}

async function getPaidToolDecision(request: Request): Promise<PaidToolDecision> {
  if (request.method !== "POST") {
    return { kind: "free" };
  }

  const body = await readJsonBody(request);
  const messages = Array.isArray(body) ? body : [body];
  const paidToolCalls = messages.filter(isPaidToolCall);

  if (paidToolCalls.length === 0) {
    return { kind: "free" };
  }

  if (paidToolCalls.length > 1) {
    return { kind: "invalid", reason: "Only one paid tool call is allowed per request." };
  }

  const paidToolCall = paidToolCalls[0];
  const toolName = getToolName(paidToolCall);
  if (!isPaidToolName(toolName)) {
    return { kind: "free" };
  }

  if (toolName === SCORE_TOOL_NAME) {
    const args = getToolArguments(paidToolCall);
    const parsed = scoreToolInputSchema.safeParse(args);
    if (!parsed.success) {
      return { kind: "invalid", reason: formatValidationError(parsed.error) };
    }

    try {
      scoreAssessmentAnswers(parsed.data.answers);
    } catch (error) {
      return {
        kind: "invalid",
        reason: error instanceof Error ? error.message : "Invalid score arguments.",
      };
    }
  }

  return { kind: "paid", toolName };
}

async function readJsonBody(request: Request) {
  try {
    return await request.clone().json();
  } catch {
    return undefined;
  }
}

function isPaidToolCall(message: unknown) {
  if (!isRecord(message) || message.method !== "tools/call") {
    return false;
  }

  return isPaidToolName(getToolName(message));
}

function getToolName(message: unknown) {
  if (!isRecord(message) || !isRecord(message.params)) {
    return undefined;
  }

  return message.params.name;
}

function getToolArguments(message: unknown) {
  if (!isRecord(message) || !isRecord(message.params)) {
    return undefined;
  }

  return message.params.arguments;
}

function isPaidToolName(value: unknown): value is PaidToolName {
  return PAID_TOOL_NAMES.some((toolName) => toolName === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValidationError(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join("; ");
}

function withMcpCompatibleAccept(request: Request) {
  const accept = request.headers.get("accept");
  const normalizedAccept = accept?.toLowerCase();
  if (!accept || !normalizedAccept?.includes(MCP_JSON_ACCEPT) || normalizedAccept.includes(MCP_SSE_ACCEPT)) {
    return request;
  }

  const headers = new Headers(request.headers);
  headers.set("accept", `${accept}, ${MCP_SSE_ACCEPT}`);
  return new Request(request, { headers });
}

function getHonoContext(context: { adapter: unknown }) {
  return (context.adapter as { c?: Context<AppEnv> }).c;
}

function toToolResult(payload: Record<string, unknown>) {
  return {
    structuredContent: payload,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export default app;
