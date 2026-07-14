import type OpenAI from "openai";

type CompletionParams =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
type Completion = OpenAI.Chat.Completions.ChatCompletion;

export async function createCompatibleChatCompletion(
  create: (params: CompletionParams) => Promise<Completion>,
  input: {
    params: Omit<
      CompletionParams,
      "max_completion_tokens" | "max_tokens" | "stream"
    >;
    maxCompletionTokens: number;
  },
): Promise<Completion> {
  let useLegacyMaxTokens = false;
  let useResponseFormat = input.params.response_format !== undefined;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { response_format: responseFormat, ...baseParams } = input.params;
    const params: CompletionParams = {
      ...baseParams,
      ...(useResponseFormat && responseFormat
        ? { response_format: responseFormat }
        : {}),
      ...(useLegacyMaxTokens
        ? { max_tokens: input.maxCompletionTokens }
        : { max_completion_tokens: input.maxCompletionTokens }),
    };

    try {
      return await create(params);
    } catch (error) {
      if (
        !useLegacyMaxTokens &&
        isUnsupportedProviderParameter(error, "max_completion_tokens")
      ) {
        useLegacyMaxTokens = true;
        continue;
      }
      if (
        useResponseFormat &&
        isUnsupportedProviderParameter(error, "response_format")
      ) {
        useResponseFormat = false;
        continue;
      }
      throw error;
    }
  }

  throw new Error("AI provider compatibility negotiation failed");
}

function isUnsupportedProviderParameter(
  error: unknown,
  parameter: string,
): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const mentionsParameter =
    message.includes(parameter) ||
    (parameter === "response_format" &&
      (message.includes("json mode") || message.includes("json object")));
  return (
    mentionsParameter &&
    ["unsupported", "not support", "unrecognized", "unknown", "invalid"].some(
      (fragment) => message.includes(fragment),
    )
  );
}
