/**
 * KARIMO Conversation Handler
 *
 * Handles Anthropic API interactions for the interview.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import type { ConversationMessage } from './types'
import { AnthropicAPIError, AnthropicKeyNotFoundError } from './errors'

/**
 * Default model to use for conversations.
 */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'

/**
 * Maximum tokens for response.
 */
const MAX_RESPONSE_TOKENS = 8192

/**
 * Anthropic client instance.
 */
let anthropicClient: Anthropic | null = null

/**
 * Get or create the Anthropic client.
 */
export function getAnthropicClient(): Anthropic {
	if (anthropicClient) {
		return anthropicClient
	}

	const apiKey = process.env.ANTHROPIC_API_KEY

	if (!apiKey) {
		throw new AnthropicKeyNotFoundError()
	}

	anthropicClient = new Anthropic({ apiKey })
	return anthropicClient
}

/**
 * Convert internal messages to Anthropic format.
 */
export function toAnthropicMessages(messages: ConversationMessage[]): MessageParam[] {
	return messages.map((msg) => ({
		role: msg.role,
		content: msg.content,
	}))
}

/**
 * Send a message and get a response.
 */
export async function sendMessage(
	systemPrompt: string,
	messages: ConversationMessage[],
	options?: {
		model?: string
		maxTokens?: number
		temperature?: number
	},
): Promise<string> {
	const client = getAnthropicClient()

	const {
		model = DEFAULT_MODEL,
		maxTokens = MAX_RESPONSE_TOKENS,
		temperature = 0.7,
	} = options ?? {}

	try {
		const response = await client.messages.create({
			model,
			max_tokens: maxTokens,
			temperature,
			system: systemPrompt,
			messages: toAnthropicMessages(messages),
		})

		// Extract text from response
		const textBlocks = response.content.filter(
			(block): block is Anthropic.TextBlock => block.type === 'text',
		)

		if (textBlocks.length === 0) {
			throw new AnthropicAPIError(undefined, 'No text content in response')
		}

		return textBlocks.map((block) => block.text).join('\n')
	} catch (error) {
		if (error instanceof AnthropicAPIError) {
			throw error
		}

		if (error instanceof Anthropic.APIError) {
			throw new AnthropicAPIError(error.status, error.message)
		}

		throw new AnthropicAPIError(undefined, (error as Error).message)
	}
}

/**
 * Stream a message response.
 */
export async function* streamMessage(
	systemPrompt: string,
	messages: ConversationMessage[],
	options?: {
		model?: string
		maxTokens?: number
		temperature?: number
	},
): AsyncGenerator<string, void, unknown> {
	const client = getAnthropicClient()

	const {
		model = DEFAULT_MODEL,
		maxTokens = MAX_RESPONSE_TOKENS,
		temperature = 0.7,
	} = options ?? {}

	try {
		const stream = await client.messages.stream({
			model,
			max_tokens: maxTokens,
			temperature,
			system: systemPrompt,
			messages: toAnthropicMessages(messages),
		})

		for await (const event of stream) {
			if (
				event.type === 'content_block_delta' &&
				event.delta.type === 'text_delta'
			) {
				yield event.delta.text
			}
		}
	} catch (error) {
		if (error instanceof Anthropic.APIError) {
			throw new AnthropicAPIError(error.status, error.message)
		}

		throw new AnthropicAPIError(undefined, (error as Error).message)
	}
}

/**
 * Collect streamed response into a single string.
 */
export async function collectStreamedResponse(
	systemPrompt: string,
	messages: ConversationMessage[],
	onChunk?: (chunk: string) => void,
	options?: {
		model?: string
		maxTokens?: number
		temperature?: number
	},
): Promise<string> {
	const chunks: string[] = []

	for await (const chunk of streamMessage(systemPrompt, messages, options)) {
		chunks.push(chunk)
		onChunk?.(chunk)
	}

	return chunks.join('')
}

/**
 * Options for tool use conversations.
 */
export interface ToolDefinition {
	name: string
	description: string
	input_schema: Record<string, unknown>
}

/**
 * Tool use result from the API.
 */
export interface ToolUseResult {
	type: 'tool_use'
	id: string
	name: string
	input: Record<string, unknown>
}

/**
 * Text result from the API.
 */
export interface TextResult {
	type: 'text'
	content: string
}

/**
 * Combined result type.
 */
export type MessageResult = TextResult | ToolUseResult

/**
 * Send a message with tool use capabilities.
 */
export async function sendMessageWithTools(
	systemPrompt: string,
	messages: ConversationMessage[],
	tools: ToolDefinition[],
	options?: {
		model?: string
		maxTokens?: number
		temperature?: number
	},
): Promise<MessageResult[]> {
	const client = getAnthropicClient()

	const {
		model = DEFAULT_MODEL,
		maxTokens = MAX_RESPONSE_TOKENS,
		temperature = 0.7,
	} = options ?? {}

	try {
		const response = await client.messages.create({
			model,
			max_tokens: maxTokens,
			temperature,
			system: systemPrompt,
			messages: toAnthropicMessages(messages),
			tools: tools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				input_schema: tool.input_schema as Anthropic.Messages.Tool.InputSchema,
			})),
		})

		const results: MessageResult[] = []

		for (const block of response.content) {
			if (block.type === 'text') {
				results.push({ type: 'text', content: block.text })
			} else if (block.type === 'tool_use') {
				results.push({
					type: 'tool_use',
					id: block.id,
					name: block.name,
					input: block.input as Record<string, unknown>,
				})
			}
		}

		return results
	} catch (error) {
		if (error instanceof Anthropic.APIError) {
			throw new AnthropicAPIError(error.status, error.message)
		}

		throw new AnthropicAPIError(undefined, (error as Error).message)
	}
}

/**
 * Continue a conversation with tool results.
 */
export async function continueWithToolResults(
	systemPrompt: string,
	messages: ConversationMessage[],
	toolUseId: string,
	toolResult: string,
	tools: ToolDefinition[],
	options?: {
		model?: string
		maxTokens?: number
		temperature?: number
	},
): Promise<MessageResult[]> {
	// Add the tool result to messages
	const updatedMessages: MessageParam[] = [
		...toAnthropicMessages(messages),
		{
			role: 'user',
			content: [
				{
					type: 'tool_result',
					tool_use_id: toolUseId,
					content: toolResult,
				},
			],
		},
	]

	const client = getAnthropicClient()

	const {
		model = DEFAULT_MODEL,
		maxTokens = MAX_RESPONSE_TOKENS,
		temperature = 0.7,
	} = options ?? {}

	try {
		const response = await client.messages.create({
			model,
			max_tokens: maxTokens,
			temperature,
			system: systemPrompt,
			messages: updatedMessages,
			tools: tools.map((tool) => ({
				name: tool.name,
				description: tool.description,
				input_schema: tool.input_schema as Anthropic.Messages.Tool.InputSchema,
			})),
		})

		const results: MessageResult[] = []

		for (const block of response.content) {
			if (block.type === 'text') {
				results.push({ type: 'text', content: block.text })
			} else if (block.type === 'tool_use') {
				results.push({
					type: 'tool_use',
					id: block.id,
					name: block.name,
					input: block.input as Record<string, unknown>,
				})
			}
		}

		return results
	} catch (error) {
		if (error instanceof Anthropic.APIError) {
			throw new AnthropicAPIError(error.status, error.message)
		}

		throw new AnthropicAPIError(undefined, (error as Error).message)
	}
}
