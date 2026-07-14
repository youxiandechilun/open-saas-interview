import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import {
  estimateTokenUpperBound,
  getGenerateAnimationTokenBudget,
  getOptimizePromptTokenBudget,
} from "./server/aiClient";
import { createCompatibleChatCompletion } from "./server/providerCompatibility";
import { resolveAiProviderLimits } from "./server/providerResolution";
import {
  calculateTokenReservation,
  calculateTokenSettlementDelta,
  tokenCapacityThreshold,
} from "./server/quotaPolicy";
import {
  buildBlogPublishingReadiness,
  buildEmailDeliveryReadiness,
  summarizeReadiness,
} from "./server/readiness";

describe("AI token governance", () => {
  it("caps each reservation with the configured completion limit", () => {
    expect(
      calculateTokenReservation({
        estimatedPromptTokens: 2_400,
        requestedCompletionTokens: 12_000,
        configuredMaxCompletionTokens: 4_000,
      }),
    ).toEqual({ reservedTokens: 6_400, maxCompletionTokens: 4_000 });

    expect(tokenCapacityThreshold(6_399, 6_400)).toBeNull();
    expect(tokenCapacityThreshold(10_000, 6_400)).toBe(3_600);
  });

  it("reconciles a reservation in both refund and overage directions", () => {
    expect(
      calculateTokenSettlementDelta({
        reservedTokens: 10_000,
        promptTokens: 2_000,
        completionTokens: 3_000,
      }),
    ).toBe(-5_000);
    expect(
      calculateTokenSettlementDelta({
        reservedTokens: 4_000,
        promptTokens: 2_500,
        completionTokens: 2_000,
      }),
    ).toBe(500);
  });

  it("reserves conservative prompt budgets for both retained AI calls", () => {
    const optimize = getOptimizePromptTokenBudget("x".repeat(100));
    const generate = getGenerateAnimationTokenBudget("生成一个清晰的动画");

    expect(optimize.requestedCompletionTokens).toBe(1_600);
    expect(generate.requestedCompletionTokens).toBe(12_000);
    expect(optimize.estimatedPromptTokens).toBeGreaterThan(100);
    expect(generate.estimatedPromptTokens).toBeGreaterThan(
      estimateTokenUpperBound("生成一个清晰的动画"),
    );
  });

  it("uses configured environment limits when no database config exists", () => {
    expect(
      resolveAiProviderLimits({
        stored: null,
        environment: {
          hourlyTokenLimit: "42000",
          maxCompletionTokens: "4096",
        },
      }),
    ).toEqual({ hourlyTokenLimit: 42_000, maxCompletionTokens: 4_096 });
  });
});

describe("OpenAI-compatible request negotiation", () => {
  it("falls back to max_tokens and then drops unsupported JSON mode", async () => {
    const create = vi.fn(
      async (
        params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      ) => {
        if ("max_completion_tokens" in params) {
          throw new Error("Unknown parameter: max_completion_tokens");
        }
        if ("response_format" in params) {
          throw new Error("response_format is not supported");
        }
        return {
          id: "completion-id",
          object: "chat.completion",
          created: 0,
          model: "compatible-model",
          choices: [],
        } as never;
      },
    );

    await createCompatibleChatCompletion(create, {
      params: {
        model: "compatible-model",
        messages: [{ role: "user", content: "Return JSON" }],
        response_format: { type: "json_object" },
      },
      maxCompletionTokens: 2_048,
    });

    expect(create).toHaveBeenCalledTimes(3);
    expect(create.mock.calls[2]?.[0]).toMatchObject({ max_tokens: 2_048 });
    expect(create.mock.calls[2]?.[0]).not.toHaveProperty("response_format");
    expect(create.mock.calls[2]?.[0]).not.toHaveProperty(
      "max_completion_tokens",
    );
  });
});

describe("system readiness summary", () => {
  it("prioritizes unavailable checks over configuration actions", () => {
    expect(
      summarizeReadiness([{ status: "ready" }, { status: "action_required" }]),
    ).toBe("action_required");
    expect(
      summarizeReadiness([
        { status: "action_required" },
        { status: "unavailable" },
      ]),
    ).toBe("unavailable");
  });

  it("links administrators to the publishing integration anchor only", () => {
    const actionPath = "/admin/ai-provider#publishing-integration";
    expect(
      buildBlogPublishingReadiness(
        {
          webhookUrlConfigured: false,
          webhookTokenConfigured: false,
          ready: false,
        },
        actionPath,
      ),
    ).toMatchObject({ status: "action_required", actionPath });
    expect(
      buildBlogPublishingReadiness(
        {
          webhookUrlConfigured: false,
          webhookTokenConfigured: false,
          ready: false,
        },
        null,
      ),
    ).toMatchObject({ status: "action_required", actionPath: null });
  });

  it("reports Dummy as log-only and links only administrators to email setup", () => {
    const integration = {
      provider: "Dummy" as const,
      sendGridApiKeyConfigured: false,
      fromAddressConfigured: false,
      fromNameConfigured: true,
      ready: false,
    };
    const actionPath = "/admin/ai-provider#email-delivery";
    expect(buildEmailDeliveryReadiness(integration, actionPath)).toMatchObject({
      key: "emailDelivery",
      status: "action_required",
      actionPath,
      detail: expect.stringContaining("server logs"),
    });
    expect(buildEmailDeliveryReadiness(integration, null)).toMatchObject({
      status: "action_required",
      actionPath: null,
    });
  });
});
