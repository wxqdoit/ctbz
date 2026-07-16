import { asc, desc, eq } from "drizzle-orm";
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
import { createDb, type AppDb } from "./db/client";
import {
  aiProviders,
  callLogs,
  managedQuestions,
  toolConfigs,
  type AiProvider,
  type ManagedQuestion,
  type NewAiProvider,
  type NewCallLog,
  type NewManagedQuestion,
  type NewToolConfig,
  type ToolConfig,
} from "./db/schema";
import {
  allDimensions,
  questionBank,
  resultLevels,
  type DimensionId,
  type OptionId,
  type Question,
} from "./data/questions";
import {
  ASSESSMENT_VERSION,
  SESSION_SIZE,
  drawAssessmentQuestionsFromBank,
  scoreAssessmentAnswersFromQuestions,
  toPublicQuestion,
  type AssessmentAnswerInput,
} from "./lib/assessment";

const DEFAULT_PAYMENT_NETWORK = "eip155:196" as const;
const DEFAULT_PAYMENT_SCHEME = "exact";
const DEFAULT_PAYMENT_PRICE = "$0.05";
const DEFAULT_PAYMENT_PRICE_LABEL = "0.05 USDT";
const DEFAULT_PAYMENT_PAY_TO = "0xdbe72d90b4a2e99c90c9a11e284bac1ea71d227d";
const META_TOOL_NAME = "ctbz_assessment_meta";
const DRAW_TOOL_NAME = "ctbz_draw_questions";
const SCORE_TOOL_NAME = "ctbz_score_assessment";
const MANAGED_TOOL_NAMES = [DRAW_TOOL_NAME, SCORE_TOOL_NAME] as const;
const MCP_JSON_ACCEPT = "application/json";
const MCP_SSE_ACCEPT = "text/event-stream";
const OPTION_IDS = ["A", "B", "C", "D"] as const satisfies readonly OptionId[];
const DIMENSION_IDS = [
  "organization",
  "decision",
  "communication",
  "talent",
  "delivery",
  "customer",
  "finance",
  "quality",
  "culture",
  "risk",
] as const satisfies readonly DimensionId[];

type ManagedToolName = (typeof MANAGED_TOOL_NAMES)[number];
type PaymentNetwork = `${string}:${string}`;

type WorkerBindings = {
  DB: D1Database;
  ADMIN_TOKEN?: string;
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
  | { kind: "free"; toolName?: string }
  | { kind: "paid"; tool: ToolConfig }
  | { kind: "invalid"; toolName?: string; reason: string };

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

const defaultToolConfigs = [
  {
    name: DRAW_TOOL_NAME,
    enabled: true,
    paid: true,
    price: DEFAULT_PAYMENT_PRICE,
    priceLabel: DEFAULT_PAYMENT_PRICE_LABEL,
    scheme: DEFAULT_PAYMENT_SCHEME,
    network: DEFAULT_PAYMENT_NETWORK,
    payTo: DEFAULT_PAYMENT_PAY_TO,
  },
  {
    name: SCORE_TOOL_NAME,
    enabled: true,
    paid: true,
    price: DEFAULT_PAYMENT_PRICE,
    priceLabel: DEFAULT_PAYMENT_PRICE_LABEL,
    scheme: DEFAULT_PAYMENT_SCHEME,
    network: DEFAULT_PAYMENT_NETWORK,
    payTo: DEFAULT_PAYMENT_PAY_TO,
  },
] satisfies Omit<NewToolConfig, "updatedAt">[];

const answerInputSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.enum(["A", "B", "C", "D"]),
});

const scoreToolInputSchema = z.object({
  answers: z.array(answerInputSchema).length(SESSION_SIZE),
});

const providerStatusSchema = z.enum(["active", "inactive"]);
const optionIdSchema = z.enum(OPTION_IDS);
const dimensionIdSchema = z.enum(DIMENSION_IDS);

const aiProviderCreateSchema = z
  .object({
    provider: z.string().trim().min(1),
    name: z.string().trim().min(1).optional(),
    baseUrl: z.string().trim().min(1),
    apiKey: z.string().trim().min(1),
    model: z.string().trim().min(1),
    status: providerStatusSchema.default("inactive"),
    note: z.string().default(""),
    sortOrder: z.coerce.number().int().default(0),
  })
  .strict();

const aiProviderPatchSchema = z
  .object({
    provider: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    baseUrl: z.string().trim().min(1).optional(),
    apiKey: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    status: providerStatusSchema.optional(),
    note: z.string().optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  .strict();

const modelFetchSchema = z
  .object({
    baseUrl: z.string().trim().min(1),
    apiKey: z.string().trim().min(1),
  })
  .strict();

const questionOptionInputSchema = z
  .object({
    id: optionIdSchema,
    label: z.string().trim().min(1),
    score: z.coerce.number().min(-10).max(10),
  })
  .strict();

const questionCreateSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    category: z.string().trim().min(1),
    text: z.string().trim().min(1),
    dimension: dimensionIdSchema,
    enabled: z.boolean().default(true),
    sortOrder: z.coerce.number().int().default(0),
    options: z.array(questionOptionInputSchema).length(4),
  })
  .strict();

const questionPatchSchema = z
  .object({
    category: z.string().trim().min(1).optional(),
    text: z.string().trim().min(1).optional(),
    dimension: dimensionIdSchema.optional(),
    enabled: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
    options: z.array(questionOptionInputSchema).length(4).optional(),
  })
  .strict();

const toolConfigPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    paid: z.boolean().optional(),
    price: z.string().min(1).optional(),
    priceLabel: z.string().min(1).optional(),
    scheme: z.literal("exact").optional(),
    network: z.string().min(1).optional(),
    payTo: z.string().min(1).optional(),
  })
  .strict();

let paymentRuntime: PaymentRuntime | undefined;
let defaultConfigsSeeded = false;
let defaultQuestionsSeeded = false;

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Accept",
      "Authorization",
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
    service: "ctbz-a2mcp-worker",
    version: ASSESSMENT_VERSION,
    managedTools: MANAGED_TOOL_NAMES,
  }),
);

app.use("/admin/*", requireAdmin);

app.get("/admin/config", async (c) => {
  const db = getDb(c);
  const tools = await listToolConfigs(db);
  return c.json(toAdminConfigResponse(tools));
});

app.patch("/admin/config", async (c) => {
  const db = getDb(c);
  const body = await readRequestJson(c);
  const parsed = toolConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_admin_config", reason: formatValidationError(parsed.error) }, 400);
  }

  const update = toToolConfigUpdate(parsed.data);
  if (Object.keys(update).length > 0) {
    await ensureDefaultToolConfigs(db);
    await db.update(toolConfigs).set({ ...update, updatedAt: nowIso() }).run();
  }

  const tools = await listToolConfigs(db);
  return c.json(toAdminConfigResponse(tools));
});

app.get("/admin/tools", async (c) => {
  const db = getDb(c);
  const tools = await listToolConfigs(db);
  return c.json({ tools });
});

app.patch("/admin/tools/:name", async (c) => {
  const name = c.req.param("name");
  if (!isManagedToolName(name)) {
    return c.json({ error: "unknown_tool", tool: name }, 404);
  }

  const db = getDb(c);
  const body = await readRequestJson(c);
  const parsed = toolConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_tool_config", reason: formatValidationError(parsed.error) }, 400);
  }

  const update = toToolConfigUpdate(parsed.data);
  await ensureDefaultToolConfigs(db);
  if (Object.keys(update).length > 0) {
    await db.update(toolConfigs).set({ ...update, updatedAt: nowIso() }).where(eq(toolConfigs.name, name)).run();
  }

  const tool = await getToolConfig(db, name);
  return c.json({ tool });
});

app.get("/admin/calls", async (c) => {
  const db = getDb(c);
  const limit = parseCallsLimit(c.req.query("limit"));
  const calls = await db.select().from(callLogs).orderBy(desc(callLogs.createdAt)).limit(limit).all();
  return c.json({ calls, limit });
});

app.get("/admin/ai-providers", async (c) => {
  const db = getDb(c);
  const providers = await listAiProviders(db);
  return c.json({ providers: providers.map(toPublicAiProvider) });
});

app.post("/admin/ai-providers/models", async (c) => {
  const body = await readRequestJson(c);
  const parsed = modelFetchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_model_fetch_request", reason: formatValidationError(parsed.error) }, 400);
  }

  try {
    const models = await fetchOpenAiModels(parsed.data.baseUrl, parsed.data.apiKey);
    return c.json({ models, firstModel: models[0] ?? null });
  } catch (error) {
    return c.json(
      {
        error: "model_fetch_failed",
        reason: error instanceof Error ? error.message : "Failed to fetch models.",
      },
      502,
    );
  }
});

app.post("/admin/ai-providers", async (c) => {
  const db = getDb(c);
  const body = await readRequestJson(c);
  const parsed = aiProviderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_ai_provider", reason: formatValidationError(parsed.error) }, 400);
  }

  try {
    const provider = await createAiProvider(db, parsed.data);
    return c.json({ provider: toPublicAiProvider(provider) }, 201);
  } catch (error) {
    return c.json(
      {
        error: "ai_provider_create_failed",
        reason: error instanceof Error ? error.message : "Failed to create AI provider.",
      },
      400,
    );
  }
});

app.patch("/admin/ai-providers/:id", async (c) => {
  const db = getDb(c);
  const id = c.req.param("id");
  const body = await readRequestJson(c);
  const parsed = aiProviderPatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_ai_provider", reason: formatValidationError(parsed.error) }, 400);
  }

  try {
    const provider = await updateAiProvider(db, id, parsed.data);
    if (!provider) {
      return c.json({ error: "ai_provider_not_found" }, 404);
    }
    return c.json({ provider: toPublicAiProvider(provider) });
  } catch (error) {
    return c.json(
      {
        error: "ai_provider_update_failed",
        reason: error instanceof Error ? error.message : "Failed to update AI provider.",
      },
      400,
    );
  }
});

app.delete("/admin/ai-providers/:id", async (c) => {
  const db = getDb(c);
  const id = c.req.param("id");
  await db.delete(aiProviders).where(eq(aiProviders.id, id)).run();
  return c.json({ ok: true });
});

app.get("/admin/questions", async (c) => {
  const db = getDb(c);
  const limit = parseQuestionLimit(c.req.query("limit"));
  await ensureDefaultQuestions(db);
  const questions = await db
    .select()
    .from(managedQuestions)
    .orderBy(asc(managedQuestions.sortOrder), asc(managedQuestions.id))
    .limit(limit)
    .all();
  return c.json({ questions: questions.map(toQuestionAdminItem), limit });
});

app.post("/admin/questions", async (c) => {
  const db = getDb(c);
  const body = await readRequestJson(c);
  const parsed = questionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_question", reason: formatValidationError(parsed.error) }, 400);
  }

  try {
    const question = await createManagedQuestion(db, parsed.data);
    return c.json({ question: toQuestionAdminItem(question) }, 201);
  } catch (error) {
    return c.json(
      {
        error: "question_create_failed",
        reason: error instanceof Error ? error.message : "Failed to create question.",
      },
      400,
    );
  }
});

app.patch("/admin/questions/:id", async (c) => {
  const db = getDb(c);
  const id = c.req.param("id");
  const body = await readRequestJson(c);
  const parsed = questionPatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_question", reason: formatValidationError(parsed.error) }, 400);
  }

  try {
    const question = await updateManagedQuestion(db, id, parsed.data);
    if (!question) {
      return c.json({ error: "question_not_found" }, 404);
    }
    return c.json({ question: toQuestionAdminItem(question) });
  } catch (error) {
    return c.json(
      {
        error: "question_update_failed",
        reason: error instanceof Error ? error.message : "Failed to update question.",
      },
      400,
    );
  }
});

app.delete("/admin/questions/:id", async (c) => {
  const db = getDb(c);
  const id = c.req.param("id");
  await db.delete(managedQuestions).where(eq(managedQuestions.id, id)).run();
  return c.json({ ok: true });
});

app.use("/mcp", async (c, next) => {
  const db = getDb(c);
  const decision = await getPaidToolDecision(c.req.raw, db);
  c.set("paidToolDecision", decision);

  if (decision.kind === "free") {
    return next();
  }

  if (decision.kind === "invalid") {
    await logToolCall(db, {
      toolName: decision.toolName ?? "unknown",
      paid: false,
      status: "invalid_request",
      httpStatus: 403,
      error: decision.reason,
    });
    return c.json({ error: "invalid_paid_tool_request", reason: decision.reason }, 403);
  }

  const paymentConfig = getPaymentConfig(c.env);
  if (paymentConfig.kind === "missing") {
    await logToolCall(db, {
      toolName: decision.tool.name,
      paid: decision.tool.paid,
      status: "payment_config_missing",
      httpStatus: 503,
      tool: decision.tool,
      error: paymentConfig.missing.join(","),
    });
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
    await logToolCall(db, {
      toolName: decision.tool.name,
      paid: decision.tool.paid,
      status: "payment_config_invalid",
      httpStatus: 503,
      tool: decision.tool,
      error: paymentConfig.reason,
    });
    return c.json({ error: "okx_facilitator_config_invalid", reason: paymentConfig.reason }, 503);
  }

  const runtime = getPaymentRuntime(paymentConfig, decision.tool);
  try {
    await ensurePaymentServerInitialized(runtime);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown facilitator initialization error.";
    await logToolCall(db, {
      toolName: decision.tool.name,
      paid: decision.tool.paid,
      status: "payment_init_failed",
      httpStatus: 502,
      tool: decision.tool,
      error: reason,
    });
    return c.json({ error: "okx_facilitator_init_failed", reason }, 502);
  }

  const result = await runtime.middleware(c, next);
  const response = result instanceof Response ? result : c.res;
  if (response?.status === 402) {
    await logToolCall(db, {
      toolName: decision.tool.name,
      paid: true,
      status: "payment_required",
      httpStatus: 402,
      tool: decision.tool,
    });
  }
  return result;
});

app.all("/mcp", async (c) => {
  const db = getDb(c);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createMcpServer(db);
  await server.connect(transport);
  return transport.handleRequest(withMcpCompatibleAccept(c.req.raw));
});

function createMcpServer(db: AppDb) {
  const server = new McpServer({
    name: "ctbz-a2mcp",
    version: "0.2.0",
  });

  server.registerTool(
    META_TOOL_NAME,
    {
      title: "草台班子检测元数据",
      description: "返回题库版本、题量、维度、结果等级和计费信息。",
    },
    async () => {
      const [tools, questions, provider] = await Promise.all([
        listToolConfigs(db),
        listAssessmentQuestions(db, true),
        getActiveAiProvider(db),
      ]);
      await logToolCall(db, {
        toolName: META_TOOL_NAME,
        paid: false,
        status: "success",
        httpStatus: 200,
      });

      const payload = {
        version: ASSESSMENT_VERSION,
        sessionSize: SESSION_SIZE,
        enabledQuestionCount: questions.length,
        dimensions: allDimensions,
        resultLevels,
        freeTools: [META_TOOL_NAME],
        managedTools: tools,
        activeAiProvider: provider ? toPublicAiProvider(provider) : null,
      };

      return toToolResult(payload);
    },
  );

  server.registerTool(
    DRAW_TOOL_NAME,
    {
      title: "抽取草台班子检测题",
      description: "按管理配置抽取 20 道检测题，返回 Agent 可直接展示给用户的题目和选项。",
    },
    async () => {
      const tool = await getToolConfigOrThrow(db, DRAW_TOOL_NAME);
      const bank = await listAssessmentQuestions(db, true);
      const questions = drawAssessmentQuestionsFromBank(bank).map(toPublicQuestion);
      await logToolCall(db, {
        toolName: DRAW_TOOL_NAME,
        paid: tool.paid,
        status: "success",
        httpStatus: 200,
        tool,
      });

      const payload = {
        version: ASSESSMENT_VERSION,
        sessionSize: SESSION_SIZE,
        questions,
        payment: toPaymentSummary(tool),
      };

      return toToolResult(payload);
    },
  );

  server.registerTool(
    SCORE_TOOL_NAME,
    {
      title: "草台班子 AI 评分",
      description: "按管理配置评分。输入 20 个 questionId/optionId 答案，返回总分、等级、结论和维度分。",
      inputSchema: {
        answers: z.array(answerInputSchema).length(SESSION_SIZE),
      },
    },
    async ({ answers }) => {
      const tool = await getToolConfigOrThrow(db, SCORE_TOOL_NAME);
      try {
        const bank = await listAssessmentQuestions(db, false);
        const result = scoreAssessmentAnswersFromQuestions(bank, answers as AssessmentAnswerInput[]);
        const provider = await getActiveAiProviderOrThrow(db);
        const aiReview = await createAiScoreReview(provider, result, answers as AssessmentAnswerInput[], bank);
        await logToolCall(db, {
          toolName: SCORE_TOOL_NAME,
          paid: tool.paid,
          status: "success",
          httpStatus: 200,
          tool,
        });

        const payload = {
          ...result,
          aiReview,
          payment: toPaymentSummary(tool),
        };

        return toToolResult(payload);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Invalid score arguments.";
        await logToolCall(db, {
          toolName: SCORE_TOOL_NAME,
          paid: tool.paid,
          status: "failed",
          httpStatus: 400,
          tool,
          error: reason,
        });
        throw error;
      }
    },
  );

  return server;
}

async function getPaidToolDecision(request: Request, db: AppDb): Promise<PaidToolDecision> {
  if (request.method !== "POST") {
    return { kind: "free" };
  }

  const body = await readJsonBody(request);
  const messages = Array.isArray(body) ? body : [body];
  const managedToolCalls = messages.filter(isManagedToolCall);

  if (managedToolCalls.length === 0) {
    return { kind: "free" };
  }

  if (managedToolCalls.length > 1) {
    return { kind: "invalid", reason: "Only one managed tool call is allowed per request." };
  }

  const managedToolCall = managedToolCalls[0];
  const toolName = getToolName(managedToolCall);
  if (!isManagedToolName(toolName)) {
    return { kind: "free" };
  }

  const tool = await getToolConfigOrThrow(db, toolName);
  if (!tool.enabled) {
    return { kind: "invalid", toolName, reason: `Tool is disabled: ${toolName}.` };
  }

  if (toolName === DRAW_TOOL_NAME) {
    try {
      await listAssessmentQuestions(db, true);
    } catch (error) {
      return {
        kind: "invalid",
        toolName,
        reason: error instanceof Error ? error.message : "Question bank is unavailable.",
      };
    }
  }

  if (toolName === SCORE_TOOL_NAME) {
    const args = getToolArguments(managedToolCall);
    const parsed = scoreToolInputSchema.safeParse(args);
    if (!parsed.success) {
      return { kind: "invalid", toolName, reason: formatValidationError(parsed.error) };
    }

    try {
      const bank = await listAssessmentQuestions(db, false);
      scoreAssessmentAnswersFromQuestions(bank, parsed.data.answers);
    } catch (error) {
      return {
        kind: "invalid",
        toolName,
        reason: error instanceof Error ? error.message : "Invalid score arguments.",
      };
    }

    const provider = await getActiveAiProvider(db);
    const providerProblem = getAiProviderConfigProblem(provider);
    if (providerProblem) {
      return { kind: "invalid", toolName, reason: providerProblem };
    }
  }

  if (!tool.paid) {
    return { kind: "free", toolName };
  }

  return { kind: "paid", tool };
}

function getPaymentRuntime(paymentConfig: Extract<PaymentConfigResult, { kind: "ok" }>, tool: ToolConfig) {
  const runtimeCacheKey = JSON.stringify({
    paymentConfig: paymentConfig.cacheKey,
    tool: {
      name: tool.name,
      scheme: tool.scheme,
      network: tool.network,
      price: tool.price,
      payTo: tool.payTo,
    },
  });
  if (paymentRuntime?.cacheKey === runtimeCacheKey) {
    return paymentRuntime;
  }

  const facilitatorClient = new OKXFacilitatorClient(paymentConfig.config);
  const resourceServer = new x402ResourceServer(facilitatorClient).register(
    tool.network as PaymentNetwork,
    new ExactEvmScheme(),
  );
  const httpServer = new x402HTTPResourceServer(resourceServer, {
    "POST /mcp": {
      accepts: {
        scheme: tool.scheme,
        network: tool.network as PaymentNetwork,
        payTo: tool.payTo,
        price: tool.price,
        maxTimeoutSeconds: 300,
      },
      resource: `mcp://ctbz/${tool.name}`,
      description: `Paid tool call: ${tool.name}`,
      mimeType: "application/json",
      unpaidResponseBody: (context) => {
        const decision = getHonoContext(context)?.get("paidToolDecision") ?? { kind: "free" };
        const activeTool = decision.kind === "paid" ? decision.tool : tool;

        return {
          contentType: "application/json",
          body: {
            error: "payment_required",
            tool: activeTool.name,
            price: activeTool.priceLabel,
            network: activeTool.network,
            payTo: activeTool.payTo,
          },
        };
      },
    },
  }).onProtectedRequest(async (context) => {
    const decision = getHonoContext(context)?.get("paidToolDecision") ?? { kind: "free" };

    if (decision.kind === "free") {
      return { grantAccess: true };
    }

    if (decision.kind === "invalid") {
      return { abort: true, reason: decision.reason };
    }
  });

  paymentRuntime = {
    cacheKey: runtimeCacheKey,
    httpServer,
    middleware: paymentMiddlewareFromHTTPServer(httpServer, undefined, undefined, false),
  };

  return paymentRuntime;
}

async function ensurePaymentServerInitialized(runtime: PaymentRuntime) {
  runtime.initPromise ??= runtime.httpServer.initialize();
  await runtime.initPromise;
}

async function ensureDefaultToolConfigs(db: AppDb) {
  if (defaultConfigsSeeded) {
    return;
  }

  const updatedAt = nowIso();
  await db
    .insert(toolConfigs)
    .values(defaultToolConfigs.map((tool) => ({ ...tool, updatedAt })))
    .onConflictDoNothing()
    .run();
  defaultConfigsSeeded = true;
}

async function listToolConfigs(db: AppDb) {
  const tools = await db.select().from(toolConfigs).all();
  if (hasAllManagedTools(tools)) {
    return tools;
  }

  defaultConfigsSeeded = false;
  await ensureDefaultToolConfigs(db);
  return db.select().from(toolConfigs).all();
}

async function getToolConfig(db: AppDb, name: ManagedToolName) {
  const tool = await db.select().from(toolConfigs).where(eq(toolConfigs.name, name)).limit(1).get();
  if (tool) {
    return tool;
  }

  defaultConfigsSeeded = false;
  await ensureDefaultToolConfigs(db);
  return db.select().from(toolConfigs).where(eq(toolConfigs.name, name)).limit(1).get();
}

async function getToolConfigOrThrow(db: AppDb, name: ManagedToolName) {
  const tool = await getToolConfig(db, name);
  if (!tool) {
    throw new Error(`Tool config not found: ${name}.`);
  }
  return tool;
}

async function listAiProviders(db: AppDb) {
  return db.select().from(aiProviders).orderBy(asc(aiProviders.sortOrder), asc(aiProviders.createdAt)).all();
}

async function getActiveAiProvider(db: AppDb) {
  return db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.status, "active"))
    .orderBy(asc(aiProviders.sortOrder), asc(aiProviders.createdAt))
    .limit(1)
    .get();
}

async function getActiveAiProviderOrThrow(db: AppDb) {
  const provider = await getActiveAiProvider(db);
  const problem = getAiProviderConfigProblem(provider);
  if (problem) {
    throw new Error(problem);
  }
  if (!provider) {
    throw new Error("No active AI provider is configured.");
  }
  return provider;
}

async function createAiProvider(db: AppDb, input: z.infer<typeof aiProviderCreateSchema>) {
  const createdAt = nowIso();
  const provider: NewAiProvider = {
    id: crypto.randomUUID(),
    provider: input.provider.trim(),
    name: input.name?.trim() || input.provider.trim(),
    baseUrl: normalizeOpenAiBaseUrl(input.baseUrl),
    apiKey: input.apiKey.trim(),
    model: input.model.trim(),
    status: input.status,
    note: input.note.trim(),
    sortOrder: input.sortOrder,
    createdAt,
    updatedAt: createdAt,
  };

  if (provider.status === "active") {
    await deactivateAiProviders(db);
  }

  await db.insert(aiProviders).values(provider).run();
  return db.select().from(aiProviders).where(eq(aiProviders.id, provider.id)).limit(1).get().then(requireRow);
}

async function updateAiProvider(db: AppDb, id: string, input: z.infer<typeof aiProviderPatchSchema>) {
  const existing = await db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1).get();
  if (!existing) {
    return null;
  }

  const update: Partial<NewAiProvider> = {
    updatedAt: nowIso(),
  };
  if (input.provider !== undefined) {
    update.provider = input.provider.trim();
  }
  if (input.name !== undefined) {
    update.name = input.name.trim();
  }
  if (input.baseUrl !== undefined) {
    update.baseUrl = normalizeOpenAiBaseUrl(input.baseUrl);
  }
  if (input.apiKey !== undefined) {
    update.apiKey = input.apiKey.trim();
  }
  if (input.model !== undefined) {
    update.model = input.model.trim();
  }
  if (input.status !== undefined) {
    update.status = input.status;
  }
  if (input.note !== undefined) {
    update.note = input.note.trim();
  }
  if (input.sortOrder !== undefined) {
    update.sortOrder = input.sortOrder;
  }

  if (update.status === "active") {
    await deactivateAiProviders(db);
  }

  await db.update(aiProviders).set(update).where(eq(aiProviders.id, id)).run();
  return db.select().from(aiProviders).where(eq(aiProviders.id, id)).limit(1).get();
}

async function deactivateAiProviders(db: AppDb) {
  await db.update(aiProviders).set({ status: "inactive", updatedAt: nowIso() }).where(eq(aiProviders.status, "active")).run();
}

async function fetchOpenAiModels(baseUrl: string, apiKey: string) {
  const normalizedBaseUrl = normalizeOpenAiBaseUrl(baseUrl);
  const response = await fetch(`${normalizedBaseUrl}/models`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${apiKey.trim()}`,
      accept: "application/json",
    },
  });
  const text = await response.text();
  const data = parseJsonResponse(text);

  if (!response.ok) {
    const reason = data?.error?.message ?? data?.message ?? `HTTP ${response.status}`;
    throw new Error(String(reason));
  }

  const modelItems = Array.isArray(data?.data) ? (data.data as unknown[]) : [];
  const models = modelItems.flatMap((item): string[] =>
    isRecord(item) && typeof item.id === "string" ? [item.id] : [],
  );

  return Array.from(new Set(models)).sort((left, right) => left.localeCompare(right)).slice(0, 200);
}

function toPublicAiProvider(provider: AiProvider) {
  const apiKeyTail = provider.apiKey.length > 4 ? provider.apiKey.slice(-4) : "";
  return {
    id: provider.id,
    provider: provider.provider,
    name: provider.name,
    baseUrl: provider.baseUrl,
    model: provider.model,
    status: provider.status,
    note: provider.note,
    sortOrder: provider.sortOrder,
    apiKeySet: provider.apiKey.length > 0,
    apiKeyPreview: apiKeyTail ? `••••${apiKeyTail}` : "",
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

async function listAssessmentQuestions(db: AppDb, enabledOnly: boolean) {
  await ensureDefaultQuestions(db);
  const rows = enabledOnly
    ? await db
        .select()
        .from(managedQuestions)
        .where(eq(managedQuestions.enabled, true))
        .orderBy(asc(managedQuestions.sortOrder), asc(managedQuestions.id))
        .all()
    : await db
        .select()
        .from(managedQuestions)
        .orderBy(asc(managedQuestions.sortOrder), asc(managedQuestions.id))
        .all();
  const questions = rows.map(toAssessmentQuestion);

  if (enabledOnly && questions.length < SESSION_SIZE) {
    throw new Error(`Question bank must contain at least ${SESSION_SIZE} enabled questions.`);
  }

  return questions;
}

async function ensureDefaultQuestions(db: AppDb) {
  if (defaultQuestionsSeeded) {
    return;
  }

  const existing = await db.select().from(managedQuestions).limit(1).get();
  if (existing) {
    defaultQuestionsSeeded = true;
    return;
  }

  const createdAt = nowIso();
  const rows = questionBank.map((question, index) => toManagedQuestionInsert(question, true, index, createdAt));
  for (let index = 0; index < rows.length; index += 8) {
    await db.insert(managedQuestions).values(rows.slice(index, index + 8)).onConflictDoNothing().run();
  }
  defaultQuestionsSeeded = true;
}

async function createManagedQuestion(db: AppDb, input: z.infer<typeof questionCreateSchema>) {
  const createdAt = nowIso();
  const id = input.id?.trim() || `q-${crypto.randomUUID()}`;
  const question = buildQuestionFromAdminInput({
    id,
    category: input.category,
    text: input.text,
    dimension: input.dimension,
    options: normalizeQuestionOptionInputs(input.options),
  });
  const row = toManagedQuestionInsert(question, input.enabled, input.sortOrder, createdAt);
  await db.insert(managedQuestions).values(row).run();
  return db.select().from(managedQuestions).where(eq(managedQuestions.id, row.id)).limit(1).get().then(requireRow);
}

async function updateManagedQuestion(db: AppDb, id: string, input: z.infer<typeof questionPatchSchema>) {
  const existing = await db.select().from(managedQuestions).where(eq(managedQuestions.id, id)).limit(1).get();
  if (!existing) {
    return null;
  }

  const currentQuestion = toAssessmentQuestion(existing);
  const dimension = input.dimension ?? existing.dimension;
  const options = normalizeQuestionOptionInputs(
    input.options ??
      currentQuestion.options.map((option) => ({
        id: option.id,
        label: option.label,
        score: option.score,
      })),
  );
  const nextQuestion = buildQuestionFromAdminInput({
    id,
    category: input.category ?? existing.category,
    text: input.text ?? existing.text,
    dimension: toDimensionId(dimension),
    options,
  });

  const updatedAt = nowIso();
  const update: Partial<NewManagedQuestion> = {
    category: nextQuestion.category,
    text: nextQuestion.text,
    attribute: nextQuestion.attribute,
    dimension: getQuestionDimension(nextQuestion),
    weightsJson: JSON.stringify(nextQuestion.weights),
    optionsJson: JSON.stringify(nextQuestion.options),
    updatedAt,
  };
  if (input.enabled !== undefined) {
    update.enabled = input.enabled;
  }
  if (input.sortOrder !== undefined) {
    update.sortOrder = input.sortOrder;
  }

  await db.update(managedQuestions).set(update).where(eq(managedQuestions.id, id)).run();
  return db.select().from(managedQuestions).where(eq(managedQuestions.id, id)).limit(1).get();
}

function toQuestionAdminItem(row: ManagedQuestion) {
  const question = toAssessmentQuestion(row);
  return {
    id: row.id,
    category: row.category,
    text: row.text,
    attribute: row.attribute,
    dimension: row.dimension,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
      score: option.score,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAssessmentQuestion(row: ManagedQuestion): Question {
  return {
    id: row.id,
    category: row.category,
    text: row.text,
    attribute: row.attribute,
    weights: parseQuestionWeights(row.weightsJson, row.id),
    options: parseQuestionOptions(row.optionsJson, row.id, toDimensionId(row.dimension)),
  };
}

function toManagedQuestionInsert(question: Question, enabled: boolean, sortOrder: number, timestamp: string): NewManagedQuestion {
  return {
    id: question.id,
    category: question.category,
    text: question.text,
    attribute: question.attribute,
    dimension: getQuestionDimension(question),
    enabled,
    sortOrder,
    weightsJson: JSON.stringify(question.weights),
    optionsJson: JSON.stringify(question.options),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function buildQuestionFromAdminInput(input: {
  id: string;
  category: string;
  text: string;
  dimension: DimensionId;
  options: Array<{ id: OptionId; label: string; score: number }>;
}): Question {
  const weights = makeDimensionWeights(input.dimension, 1);
  return {
    id: input.id.trim(),
    category: input.category.trim(),
    text: input.text.trim(),
    attribute: `${input.dimension}:${input.id.trim()}`,
    weights,
    options: input.options.map((option) => ({
      id: option.id,
      label: option.label.trim(),
      attribute: `${input.dimension}:${input.id.trim()}:${option.id}`,
      score: option.score,
      weights: makeDimensionWeights(input.dimension, option.score),
    })),
  };
}

function normalizeQuestionOptionInputs(options: Array<{ id: OptionId; label: string; score: number }>) {
  const seen = new Set<OptionId>();
  options.forEach((option) => {
    if (seen.has(option.id)) {
      throw new Error(`Duplicate option id: ${option.id}.`);
    }
    seen.add(option.id);
  });

  return OPTION_IDS.map((optionId) => {
    const option = options.find((item) => item.id === optionId);
    if (!option) {
      throw new Error(`Missing option id: ${optionId}.`);
    }
    return option;
  });
}

function parseQuestionWeights(value: string, questionId: string) {
  const parsed = parseJsonResponse(value);
  if (!isRecord(parsed)) {
    throw new Error(`Invalid weights_json for ${questionId}.`);
  }

  return DIMENSION_IDS.reduce(
    (weights, dimensionId) => ({
      ...weights,
      [dimensionId]: typeof parsed[dimensionId] === "number" ? parsed[dimensionId] : 0,
    }),
    {} as Record<DimensionId, number>,
  );
}

function parseQuestionOptions(value: string, questionId: string, fallbackDimension: DimensionId) {
  const parsed = parseJsonResponse(value);
  if (!Array.isArray(parsed)) {
    throw new Error(`Invalid options_json for ${questionId}.`);
  }

  return normalizeQuestionOptionInputs(
    parsed.map((item) => {
      if (!isRecord(item) || typeof item.label !== "string" || typeof item.score !== "number") {
        throw new Error(`Invalid option entry for ${questionId}.`);
      }
      return {
        id: toOptionId(item.id),
        label: item.label,
        score: item.score,
      };
    }),
  ).map((option) => {
    const dimension = getPrimaryDimensionFromOptionJson(parsed, option.id) ?? fallbackDimension;
    return {
      id: option.id,
      label: option.label,
      attribute: `${dimension}:${questionId}:${option.id}`,
      score: option.score,
      weights: makeDimensionWeights(dimension, option.score),
    };
  });
}

function getPrimaryDimensionFromOptionJson(parsedOptions: unknown[], optionId: OptionId) {
  const option = parsedOptions.find((item) => isRecord(item) && item.id === optionId);
  if (!isRecord(option) || !isRecord(option.weights)) {
    return undefined;
  }
  const weights = option.weights;
  const dimension = DIMENSION_IDS.find((dimensionId) => Number(weights[dimensionId] ?? 0) > 0);
  return dimension;
}

function getQuestionDimension(question: Question) {
  return DIMENSION_IDS.find((dimensionId) => question.weights[dimensionId] > 0) ?? DIMENSION_IDS[0];
}

function makeDimensionWeights(dimension: DimensionId, score: number) {
  return DIMENSION_IDS.reduce(
    (weights, dimensionId) => ({
      ...weights,
      [dimensionId]: dimensionId === dimension ? score : 0,
    }),
    {} as Record<DimensionId, number>,
  );
}

async function createAiScoreReview(
  provider: AiProvider,
  result: ReturnType<typeof scoreAssessmentAnswersFromQuestions>,
  answers: AssessmentAnswerInput[],
  questions: Question[],
) {
  const baseUrl = normalizeOpenAiBaseUrl(provider.baseUrl);
  const answerRows = toAiAnswerRows(answers, questions);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${provider.apiKey}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "你是草台班子检测的评分助手。基于输入的结构化分数和答题明细，输出中文评分意见，包含结论、主要风险、改进建议，控制在 180 字内。",
        },
        {
          role: "user",
          content: JSON.stringify({
            version: result.version,
            answeredCount: result.answeredCount,
            health: result.health,
            level: result.level,
            dimensions: result.dimensions,
            answers: answerRows,
          }),
        },
      ],
    }),
  });
  const text = await response.text();
  const data = parseJsonResponse(text);
  if (!response.ok) {
    const reason = data?.error?.message ?? data?.message ?? `HTTP ${response.status}`;
    throw new Error(String(reason));
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("AI provider returned an empty scoring response.");
  }

  return {
    providerId: provider.id,
    providerName: provider.name,
    model: provider.model,
    content: content.trim(),
  };
}

function toAiAnswerRows(answers: AssessmentAnswerInput[], questions: Question[]) {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return answers.map((answer) => {
    const question = byId.get(answer.questionId);
    const option = question?.options.find((item) => item.id === answer.optionId);
    if (!question || !option) {
      throw new Error(`Invalid answer row: ${answer.questionId}.`);
    }
    return {
      questionId: question.id,
      category: question.category,
      question: question.text,
      optionId: option.id,
      answer: option.label,
      score: option.score,
    };
  });
}

function getAiProviderConfigProblem(provider: AiProvider | undefined) {
  if (!provider) {
    return "No active AI provider is configured.";
  }
  if (provider.status !== "active") {
    return "Active AI provider is not enabled.";
  }
  if (!provider.apiKey.trim()) {
    return "Active AI provider API key is empty.";
  }
  if (!provider.model.trim()) {
    return "Active AI provider model is empty.";
  }
  try {
    normalizeOpenAiBaseUrl(provider.baseUrl);
  } catch (error) {
    return error instanceof Error ? error.message : "Active AI provider base URL is invalid.";
  }
  return undefined;
}

function normalizeOpenAiBaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Base URL must be an OpenAI-compatible /v1 root URL.");
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost)) {
    throw new Error("Base URL must use https, except localhost.");
  }

  if (!url.pathname.replace(/\/+$/, "").endsWith("/v1")) {
    throw new Error("Base URL must end with /v1.");
  }

  return url.toString().replace(/\/+$/, "");
}

function toOptionId(value: unknown): OptionId {
  if (OPTION_IDS.some((optionId) => optionId === value)) {
    return value as OptionId;
  }
  throw new Error(`Invalid option id: ${String(value)}.`);
}

function toDimensionId(value: string): DimensionId {
  if (DIMENSION_IDS.some((dimensionId) => dimensionId === value)) {
    return value as DimensionId;
  }
  throw new Error(`Invalid dimension id: ${value}.`);
}

function requireRow<T>(row: T | undefined) {
  if (!row) {
    throw new Error("Database row was not returned.");
  }
  return row;
}

async function logToolCall(
  db: AppDb,
  input: {
    toolName: string;
    paid: boolean;
    status: string;
    httpStatus: number;
    tool?: ToolConfig;
    error?: string;
  },
) {
  const row: NewCallLog = {
    id: crypto.randomUUID(),
    toolName: input.toolName,
    paid: input.paid,
    status: input.status,
    httpStatus: input.httpStatus,
    price: input.tool?.priceLabel,
    network: input.tool?.network,
    payTo: input.tool?.payTo,
    error: input.error,
    createdAt: nowIso(),
  };
  await db.insert(callLogs).values(row).run();
}

function toToolConfigUpdate(input: z.infer<typeof toolConfigPatchSchema>) {
  const update: Partial<NewToolConfig> = {};
  if (input.enabled !== undefined) {
    update.enabled = input.enabled;
  }
  if (input.paid !== undefined) {
    update.paid = input.paid;
  }
  if (input.price !== undefined) {
    update.price = normalizePaymentPrice(input.price);
    update.priceLabel = input.priceLabel?.trim() ?? priceToLabel(update.price);
  } else if (input.priceLabel !== undefined) {
    update.priceLabel = input.priceLabel.trim();
  }
  if (input.scheme !== undefined) {
    update.scheme = input.scheme;
  }
  if (input.network !== undefined) {
    update.network = normalizeNetwork(input.network);
  }
  if (input.payTo !== undefined) {
    update.payTo = input.payTo.trim();
  }
  return update;
}

function normalizePaymentPrice(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("$") ? trimmed : `$${trimmed}`;
  if (!/^\$[0-9]+(\.[0-9]{1,6})?$/.test(normalized)) {
    throw new Error("price must be a USD amount such as $0.05.");
  }
  return normalized;
}

function priceToLabel(price: string) {
  return `${price.replace(/^\$/, "")} USDT`;
}

function normalizeNetwork(value: string) {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9]+:[A-Za-z0-9._-]+$/.test(trimmed)) {
    throw new Error("network must use namespace:reference format.");
  }
  return trimmed;
}

function toPaymentSummary(tool: ToolConfig) {
  return {
    enabled: tool.enabled,
    paid: tool.paid,
    scheme: tool.scheme,
    network: tool.network,
    price: tool.priceLabel,
    payTo: tool.payTo,
  };
}

function toAdminConfigResponse(tools: ToolConfig[]) {
  return {
    freeTools: [META_TOOL_NAME],
    managedTools: tools,
  };
}

function hasAllManagedTools(tools: ToolConfig[]) {
  return MANAGED_TOOL_NAMES.every((toolName) => tools.some((tool) => tool.name === toolName));
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

async function requireAdmin(c: Context<AppEnv>, next: Next) {
  const expectedToken = c.env.ADMIN_TOKEN?.trim();
  if (!expectedToken) {
    return c.json({ error: "admin_token_not_configured" }, 503);
  }

  const authorization = c.req.header("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  if (token !== expectedToken) {
    return c.json({ error: "unauthorized" }, 401);
  }

  return next();
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

async function readRequestJson(c: Context<AppEnv>) {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

async function readJsonBody(request: Request) {
  try {
    return await request.clone().json();
  } catch {
    return undefined;
  }
}

function isManagedToolCall(message: unknown) {
  if (!isRecord(message) || message.method !== "tools/call") {
    return false;
  }

  return isManagedToolName(getToolName(message));
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

function isManagedToolName(value: unknown): value is ManagedToolName {
  return MANAGED_TOOL_NAMES.some((toolName) => toolName === value);
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

function parseCallsLimit(value: string | undefined) {
  if (!value) {
    return 50;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 50;
  }

  return Math.min(200, Math.max(1, parsed));
}

function parseQuestionLimit(value: string | undefined) {
  if (!value) {
    return 250;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 250;
  }

  return Math.min(500, Math.max(1, parsed));
}

function getDb(c: Context<AppEnv>) {
  return createDb(c.env.DB);
}

function getHonoContext(context: { adapter: unknown }) {
  return (context.adapter as { c?: Context<AppEnv> }).c;
}

function nowIso() {
  return new Date().toISOString();
}

function parseJsonResponse(text: string): any {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
