import { describe, expect, it } from "vitest";
import {
  buildMcpToolCall,
  buildSampleAnswers,
  createCurlExample,
  createPaidRetryCurlExample,
  isSamePaymentAddress,
} from "../src/lib/mcpPayments";

describe("mcp payment helpers", () => {
  it("builds JSON-RPC tool call bodies", () => {
    expect(buildMcpToolCall("ctbz_draw_questions")).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "ctbz_draw_questions",
        arguments: {},
      },
    });
  });

  it("builds 20 sample score answers from question ids", () => {
    const answers = buildSampleAnswers(Array.from({ length: 22 }, (_, index) => `q-${String(index + 1).padStart(3, "0")}`));

    expect(answers).toHaveLength(20);
    expect(answers[0]).toEqual({ questionId: "q-001", optionId: "A" });
    expect(answers[19]).toEqual({ questionId: "q-020", optionId: "A" });
  });

  it("creates curl examples with MCP and payment headers", () => {
    const freeExample = createCurlExample("https://example.com/", "ctbz_assessment_meta");
    const paidExample = createPaidRetryCurlExample("https://example.com/", "ctbz_draw_questions");

    expect(freeExample).toContain("https://example.com/mcp");
    expect(freeExample).toContain("'accept: application/json, text/event-stream'");
    expect(paidExample).toContain("PAYMENT-SIGNATURE: <x402 payment payload>");
    expect(paidExample).toContain("ctbz_draw_questions");
  });

  it("detects self-payment addresses", () => {
    expect(isSamePaymentAddress("0xDBe72D90B4A2e99C90c9A11E284bAC1eA71D227D", "0xdbe72d90b4a2e99c90c9a11e284bac1ea71d227d")).toBe(true);
    expect(isSamePaymentAddress("0x0000000000000000000000000000000000000001", "0xdbe72d90b4a2e99c90c9a11e284bac1ea71d227d")).toBe(false);
  });
});
