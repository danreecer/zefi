import 'server-only'

import type { z } from 'zod'

/**
 * The AI provider contract.
 *
 * ZeFi treats the language model as a replaceable component, exactly as it does
 * simulation, swap routing and portfolio pricing. Two rules hold for every
 * implementation:
 *
 *  1. `generateStructured` must obtain output through a forced tool/function
 *     call and return only after the caller's Zod schema has validated it.
 *     Free-text JSON parsing is not an acceptable implementation.
 *  2. A failure is an error. No provider may return a plausible object it
 *     invented in order to satisfy the signature.
 */

export type AiProviderName = 'anthropic' | 'openai'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface TextRequest {
  system: string
  messages: ChatTurn[]
  maxTokens?: number
  temperature?: number
}

export interface StructuredRequest<T extends z.ZodType> {
  system: string
  messages: ChatTurn[]
  schema: T
  toolName: string
  toolDescription: string
  maxTokens?: number
  temperature?: number
}

export interface AiProvider {
  readonly name: AiProviderName
  readonly model: string
  generateText(request: TextRequest): Promise<string>
  generateStructured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<z.infer<T>>
}

export type AiFailureReason =
  | 'not-configured'
  | 'timeout'
  | 'rate-limited'
  | 'provider-error'
  | 'invalid-output'

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    public readonly reason: AiFailureReason,
    public readonly provider?: AiProviderName,
  ) {
    super(message)
    this.name = 'AiUnavailableError'
  }
}

/** Shared: the first five Zod issues, formatted for a repair prompt. */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ')
}
