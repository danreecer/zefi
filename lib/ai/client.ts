import 'server-only'

import type { z } from 'zod'

import { serverEnv } from '@/lib/config/env'
import { AiUnavailableError, type AiProvider, type StructuredRequest, type TextRequest } from './provider'
import { AnthropicProvider } from './providers/anthropic'
import { OpenAiProvider } from './providers/openai'

/**
 * The single point at which ZeFi talks to a model.
 *
 * Which vendor answers is configuration, not architecture. `AI_PROVIDER` picks
 * one explicitly; with it unset, ZeFi uses whichever of Anthropic or OpenAI has
 * both a key and a model configured, preferring Anthropic.
 *
 * Two rules hold everywhere downstream of this file:
 *
 *  1. Structured output is obtained through a forced tool call and parsed with
 *     Zod, so a chatty model cannot produce a half-valid object that slips
 *     through.
 *  2. The model identifier is read from the environment. Nothing in this
 *     codebase hardcodes a model name, because model names expire.
 */

export { AiUnavailableError } from './provider'
export type { AiProviderName, ChatTurn } from './provider'

let cached: AiProvider | null = null

function build(): AiProvider {
  const { provider, apiKey, model, maxTokens, timeoutMs } = serverEnv.ai

  if (!provider || !apiKey || !model) {
    throw new AiUnavailableError(
      'The AI layer is not configured. Set ANTHROPIC_API_KEY + ANTHROPIC_MODEL, or OPENAI_API_KEY + OPENAI_MODEL.',
      'not-configured',
    )
  }

  if (provider === 'openai') {
    return new OpenAiProvider({
      apiKey,
      model,
      maxTokens,
      timeoutMs,
      baseURL: serverEnv.ai.baseUrl,
    })
  }

  return new AnthropicProvider({ apiKey, model, maxTokens, timeoutMs })
}

export function getAiProvider(): AiProvider {
  if (!cached) cached = build()
  return cached
}

export function aiConfigured(): boolean {
  return serverEnv.ai.configured
}

/** Plain-text completion. Used only for explanation, never for values. */
export function generateText(request: TextRequest): Promise<string> {
  return getAiProvider().generateText(request)
}

/**
 * Structured output via a forced tool call.
 *
 * On a schema mismatch the model gets exactly one repair attempt with the
 * validation error attached. A second failure is an error, not a fallback: the
 * caller decides what to tell the user, and it will not be a fabricated object.
 */
export function generateStructured<T extends z.ZodType>(
  request: StructuredRequest<T>,
): Promise<z.infer<T>> {
  return getAiProvider().generateStructured(request)
}

/** Exposed for tests, so a stubbed provider does not leak between cases. */
export function __resetAiProvider() {
  cached = null
}
