import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatXAI } from "@langchain/xai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/**
 * Primary: Grok 3 Mini via xAI. Fallback: Gemini 2.5 Flash.
 */
export function createAdBrainLlm(): BaseChatModel {
  const primary = new ChatXAI({
    model: "grok-3-mini",
    temperature: 0,
    apiKey: requireEnv("XAI_API_KEY"),
  });

  const fallback = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    apiKey: requireEnv("GOOGLE_AI_API_KEY"),
  });

  return primary.withFallbacks({
    fallbacks: [fallback],
  }) as unknown as BaseChatModel;
}
