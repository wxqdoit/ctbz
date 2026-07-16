import type { AssessmentAnswerInput } from "./assessment";
import type { ClientEvmSigner } from "@okxweb3/x402-evm";
import type { WalletClient } from "viem";

export const MCP_ENDPOINT_PATH = "/mcp";

export type McpToolName = "ctbz_assessment_meta" | "ctbz_draw_questions" | "ctbz_score_assessment";

export type McpToolCallBody = {
  jsonrpc: "2.0";
  id: number;
  method: "tools/call";
  params: {
    name: McpToolName;
    arguments: Record<string, unknown>;
  };
};

export type McpHttpResult = {
  status: number;
  ok: boolean;
  body: unknown;
  paymentRequired?: unknown;
  paymentResponse?: unknown;
};

export type PaidMcpHttpResult = {
  initial: McpHttpResult;
  retry?: McpHttpResult;
  paymentHeaders?: Record<string, string>;
};

export function buildMcpToolCall(name: McpToolName, args: Record<string, unknown> = {}, id = 1): McpToolCallBody {
  return {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  };
}

export async function callMcpTool(apiBase: string, name: McpToolName, args: Record<string, unknown> = {}) {
  const response = await fetch(`${normalizeApiBase(apiBase)}${MCP_ENDPOINT_PATH}`, {
    method: "POST",
    headers: getMcpHeaders(),
    body: JSON.stringify(buildMcpToolCall(name, args)),
  });

  return toMcpHttpResult(response);
}

export async function callPaidMcpTool(
  apiBase: string,
  name: McpToolName,
  args: Record<string, unknown>,
  walletClient: WalletClient,
): Promise<PaidMcpHttpResult> {
  const endpoint = `${normalizeApiBase(apiBase)}${MCP_ENDPOINT_PATH}`;
  const requestBody = JSON.stringify(buildMcpToolCall(name, args));
  const initialResponse = await fetch(endpoint, {
    method: "POST",
    headers: getMcpHeaders(),
    body: requestBody,
  });
  const initial = await toMcpHttpResult(initialResponse);

  if (initialResponse.status !== 402) {
    return { initial };
  }

  const httpClient = await createX402HttpClient(walletClient);
  const paymentRequired = httpClient.getPaymentRequiredResponse((headerName) => initialResponse.headers.get(headerName));
  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);
  const retryResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...getMcpHeaders(),
      ...paymentHeaders,
    },
    body: requestBody,
  });
  const retry = await toMcpHttpResult(retryResponse);

  return {
    initial,
    retry,
    paymentHeaders: maskPaymentHeaders(paymentHeaders),
  };
}

export function buildSampleAnswers(questionIds: string[]): AssessmentAnswerInput[] {
  return questionIds.slice(0, 20).map((questionId) => ({
    questionId,
    optionId: "A",
  }));
}

export function isSamePaymentAddress(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = normalizeAddress(left);
  const normalizedRight = normalizeAddress(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

export function createCurlExample(apiBase: string, name: McpToolName, args: Record<string, unknown> = {}) {
  const endpoint = `${normalizeApiBase(apiBase)}${MCP_ENDPOINT_PATH}`;
  const body = JSON.stringify(buildMcpToolCall(name, args), null, 2);
  return [
    `curl -i -X POST '${endpoint}' \\`,
    "  -H 'content-type: application/json' \\",
    "  -H 'accept: application/json, text/event-stream' \\",
    `  --data '${body}'`,
  ].join("\n");
}

export function createPaidRetryCurlExample(apiBase: string, name: McpToolName, args: Record<string, unknown> = {}) {
  const endpoint = `${normalizeApiBase(apiBase)}${MCP_ENDPOINT_PATH}`;
  const body = JSON.stringify(buildMcpToolCall(name, args), null, 2);
  return [
    `curl -i -X POST '${endpoint}' \\`,
    "  -H 'content-type: application/json' \\",
    "  -H 'accept: application/json, text/event-stream' \\",
    "  -H 'PAYMENT-SIGNATURE: <x402 payment payload>' \\",
    `  --data '${body}'`,
  ].join("\n");
}

function normalizeApiBase(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function normalizeAddress(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized && /^0x[a-f0-9]{40}$/.test(normalized) ? normalized : "";
}

function getMcpHeaders() {
  return {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
}

async function toMcpHttpResult(response: Response): Promise<McpHttpResult> {
  const text = await response.text();
  return {
    status: response.status,
    ok: response.ok,
    body: parseJson(text) ?? text,
    paymentRequired: readEncodedHeader(response, "PAYMENT-REQUIRED"),
    paymentResponse: readEncodedHeader(response, "PAYMENT-RESPONSE"),
  };
}

function toX402Signer(walletClient: WalletClient): ClientEvmSigner {
  const account = walletClient.account;
  if (!account?.address) {
    throw new Error("钱包账户未连接");
  }

  return {
    address: account.address,
    signTypedData: (message) =>
      walletClient.signTypedData({
        account,
        domain: message.domain,
        types: message.types,
        primaryType: message.primaryType,
        message: message.message,
      } as Parameters<WalletClient["signTypedData"]>[0]),
  };
}

async function createX402HttpClient(walletClient: WalletClient) {
  const [{ x402Client, x402HTTPClient }, { registerExactEvmScheme }] = await Promise.all([
    import("@okxweb3/x402-core/client"),
    import("@okxweb3/x402-evm/exact/client"),
  ]);

  return new x402HTTPClient(registerExactEvmScheme(new x402Client(), { signer: toX402Signer(walletClient) }));
}

function readEncodedHeader(response: Response, name: string) {
  const value = response.headers.get(name);
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(atob(value));
  } catch {
    return value;
  }
}

function parseJson(text: string) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function maskPaymentHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, value.length > 24 ? `${value.slice(0, 12)}...${value.slice(-8)}` : value]),
  );
}
