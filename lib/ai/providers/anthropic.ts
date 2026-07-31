import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

import {
  AiUnavailableError,
  formatZodError,
  type AiProvider,
  type StructuredRequest,
  type TextRequest,
} from '../provider'

export interface AnthropicProviderOptions {
  apiKey: string
  model: string
  maxTokens: number
  timeoutMs: number
}

export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic' as const
  readonly model: string

  private readonly client: Anthropic
  private readonly options: AnthropicProviderOptions

  constructor(options: AnthropicProviderOptions) {
    this.options = options
    this.model = options.model
    this.client = new Anthropic({
      apiKey: options.apiKey,
      timeout: options.timeoutMs,
      maxRetries: 2,
    })
  }

  async generateText(request: TextRequest): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens ?? this.options.maxTokens,
        temperature: request.temperature ?? 0.4,
        system: request.system,
        messages: request.messages.map((turn) => ({ role: turn.role, content: turn.content })),
      })

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim()

      if (!text) throw new AiUnavailableError('The model returned an empty response.', 'invalid-output', this.name)
      return text
    } catch (error) {
      throw this.mapError(error)
    }
  }

  /**
   * Structured output via a forced tool call, with exactly one repair attempt.
   * A second schema failure is an error rather than a fabricated object.
   */
  async generateStructured<T extends z.ZodType>(request: StructuredRequest<T>): Promise<z.infer<T>> {
    const tool: Anthropic.Tool = {
      name: request.toolName,
      description: request.toolDescription,
      input_schema: z.toJSONSchema(request.schema, {
        target: 'draft-7',
        io: 'input',
        unrepresentable: 'any',
      }) as Anthropic.Tool.InputSchema,
    }

    const messages: Anthropic.MessageParam[] = request.messages.map((turn) => ({
      role: turn.role,
      content: turn.content,
    }))

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response: Anthropic.Message
      try {
        response = await this.client.messages.create({
          model: this.model,
          max_tokens: request.maxTokens ?? this.options.maxTokens,
          temperature: request.temperature ?? 0,
          system: request.system,
          messages,
          tools: [tool],
          tool_choice: { type: 'tool', name: request.toolName },
        })
      } catch (error) {
        throw this.mapError(error)
      }

      const block = response.content.find(
        (item): item is Anthropic.ToolUseBlock =>
          item.type === 'tool_use' && item.name === request.toolName,
      )

      if (!block) {
        if (attempt === 0) {
          messages.push({
            role: 'user',
            content: `You did not call the ${request.toolName} tool. Call it now with the required fields.`,
          })
          continue
        }
        throw new AiUnavailableError(
          `The model did not call ${request.toolName} after two attempts.`,
          'invalid-output',
          this.name,
        )
      }

      const parsed = request.schema.safeParse(block.input)
      if (parsed.success) return parsed.data

      if (attempt === 0) {
        messages.push(
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: block.id,
                is_error: true,
                content: `Schema validation failed: ${formatZodError(parsed.error)}. Call ${request.toolName} again with corrected values.`,
              },
            ],
          },
        )
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

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return new AiUnavailableError(
          'The AI provider rate limited this request. Try again shortly.',
          'rate-limited',
          this.name,
        )
      }
      if (error.status === 401 || error.status === 403) {
        return new AiUnavailableError('The configured ANTHROPIC_API_KEY was rejected.', 'not-configured', this.name)
      }
      if (error.status === 404) {
        return new AiUnavailableError(
          `The configured ANTHROPIC_MODEL (“${this.model}”) was not found. Check it against the models your key can access.`,
          'not-configured',
          this.name,
        )
      }
      return new AiUnavailableError(`Anthropic returned an error: ${error.message}`, 'provider-error', this.name)
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
