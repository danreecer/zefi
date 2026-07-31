import 'server-only'

import OpenAI from 'openai'
import { z } from 'zod'

import {
  AiUnavailableError,
  formatZodError,
  type AiProvider,
  type StructuredRequest,
  type TextRequest,
} from '../provider'

export interface OpenAiProviderOptions {
  apiKey: string
  model: string
  maxTokens: number
  timeoutMs: number
  baseURL?: string | undefined
}

/**
 * OpenAI provider.
 *
 * Deliberately mirrors the Anthropic implementation rather than reaching for
 * OpenAI-specific conveniences: a forced function call, Zod validation, and one
 * repair attempt. Keeping both providers on the same contract means switching
 * `AI_PROVIDER` changes which vendor answers, and nothing else about how ZeFi
 * behaves — including what happens when the model gets it wrong.
 */
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai' as const
  readonly model: string

  private readonly client: OpenAI
  private readonly options: OpenAiProviderOptions

  constructor(options: OpenAiProviderOptions) {
    this.options = options
    this.model = options.model
    this.client = new OpenAI({
      apiKey: options.apiKey,
      timeout: options.timeoutMs,
      maxRetries: 2,
      ...(options.baseURL ? { baseURL: options.baseURL } : {}),
    })
  }

  async generateText(request: TextRequest): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_completion_tokens: request.maxTokens ?? this.options.maxTokens,
        temperature: request.temperature ?? 0.4,
        messages: [
          { role: 'system', content: request.system },
          ...request.messages.map((turn) => ({ role: turn.role, content: turn.content })),
        ],
      })

      const text = response.choices[0]?.message?.content?.trim() ?? ''
      if (!text) {
        throw new AiUnavailableError('The model returned an empty response.', 'invalid-output', this.name)
      }
      return text
    } catch (error) {
      throw this.mapError(error)
    }
  }

  async generateStructured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<z.infer<T>> {
    const parameters = z.toJSONSchema(request.schema, {
      target: 'draft-7',
      io: 'input',
      unrepresentable: 'any',
    }) as Record<string, unknown>

    const tool: OpenAI.Chat.Completions.ChatCompletionTool = {
      type: 'function',
      function: {
        name: request.toolName,
        description: request.toolDescription,
        parameters,
      },
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.system },
      ...request.messages.map((turn) => ({ role: turn.role, content: turn.content })),
    ]

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: OpenAI.Chat.Completions.ChatCompletion
      try {
        response = await this.client.chat.completions.create({
          model: this.model,
          max_completion_tokens: request.maxTokens ?? this.options.maxTokens,
          temperature: request.temperature ?? 0,
          messages,
          tools: [tool],
          tool_choice: { type: 'function', function: { name: request.toolName } },
        })
      } catch (error) {
        throw this.mapError(error)
      }

      const message = response.choices[0]?.message
      const call = message?.tool_calls?.find(
        (item) => item.type === 'function' && item.function.name === request.toolName,
      )

      if (!call || call.type !== 'function') {
        if (attempt === 0) {
          messages.push({
            role: 'user',
            content: `You did not call the ${request.toolName} function. Call it now with the required fields.`,
          })
          continue
        }
        throw new AiUnavailableError(
          `The model did not call ${request.toolName} after two attempts.`,
          'invalid-output',
          this.name,
        )
      }

      let candidate: unknown
      try {
        candidate = JSON.parse(call.function.arguments)
      } catch {
        candidate = null
      }

      const parsed = request.schema.safeParse(candidate)
      if (parsed.success) return parsed.data

      if (attempt === 0) {
        messages.push(message as OpenAI.Chat.Completions.ChatCompletionMessageParam, {
          role: 'tool',
          tool_call_id: call.id,
          content: `Schema validation failed: ${formatZodError(parsed.error)}. Call ${request.toolName} again with corrected values.`,
        })
        continue
      }

      throw new AiUnavailableError(
        `Model output failed schema validation twice: ${formatZodError(parsed.error)}`,
        'invalid-output',
        this.name,
      )
    }

    throw new AiUnavailableError('Structured generation exhausted its attempts.', 'invalid-output', this.name)
  }

  private mapError(error: unknown): AiUnavailableError {
    if (error instanceof AiUnavailableError) return error

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return new AiUnavailableError(
          'The AI provider rate limited this request. Try again shortly.',
          'rate-limited',
          this.name,
        )
      }
      if (error.status === 401 || error.status === 403) {
        return new AiUnavailableError('The configured OPENAI_API_KEY was rejected.', 'not-configured', this.name)
      }
      if (error.status === 404) {
        return new AiUnavailableError(
          `The configured OPENAI_MODEL (“${this.model}”) was not found. Check it against the models your key can access.`,
          'not-configured',
          this.name,
        )
      }
      return new AiUnavailableError(`OpenAI returned an error: ${error.message}`, 'provider-error', this.name)
    }

    if (error instanceof Error && /timeout|aborted/i.test(error.message)) {
      return new AiUnavailableError(
        `The AI request exceeded ${this.options.timeoutMs}ms and was aborted.`,
        'timeout',
        this.name,
      )
    }

    return new AiUnavailableError(
      error instanceof Error ? error.message : 'Unknown AI provider failure.',
      'provider-error',
      this.name,
    )
  }
}
