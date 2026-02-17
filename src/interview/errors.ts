/**
 * KARIMO Interview Errors
 *
 * Error classes for interview operations.
 */

/**
 * Base error class for interview-related errors.
 */
export class InterviewError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'InterviewError'
	}
}

/**
 * Error thrown when Anthropic API key is not configured.
 */
export class AnthropicKeyNotFoundError extends InterviewError {
	constructor() {
		super(
			'Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable.',
		)
		this.name = 'AnthropicKeyNotFoundError'
	}
}

/**
 * Error thrown when Anthropic API call fails.
 */
export class AnthropicAPIError extends InterviewError {
	constructor(
		public readonly statusCode: number | undefined,
		public readonly details: string,
	) {
		super(`Anthropic API error (${statusCode ?? 'unknown'}): ${details}`)
		this.name = 'AnthropicAPIError'
	}
}

/**
 * Error thrown when context window is exceeded.
 */
export class ContextOverflowError extends InterviewError {
	constructor(
		public readonly currentTokens: number,
		public readonly maxTokens: number,
	) {
		super(
			`Context overflow: ${currentTokens} tokens exceeds ${maxTokens} maximum.`,
		)
		this.name = 'ContextOverflowError'
	}
}

/**
 * Error thrown when interview session cannot be loaded.
 */
export class SessionLoadError extends InterviewError {
	constructor(
		public readonly prdSlug: string,
		public readonly details: string,
	) {
		super(`Failed to load interview session for ${prdSlug}: ${details}`)
		this.name = 'SessionLoadError'
	}
}

/**
 * Error thrown when interview session cannot be saved.
 */
export class SessionSaveError extends InterviewError {
	constructor(
		public readonly prdSlug: string,
		public readonly details: string,
	) {
		super(`Failed to save interview session for ${prdSlug}: ${details}`)
		this.name = 'SessionSaveError'
	}
}

/**
 * Error thrown when PRD file cannot be created or updated.
 */
export class PRDFileError extends InterviewError {
	constructor(
		public readonly path: string,
		public readonly operation: 'create' | 'update' | 'read',
		public readonly details: string,
	) {
		super(`Failed to ${operation} PRD file at ${path}: ${details}`)
		this.name = 'PRDFileError'
	}
}

/**
 * Error thrown when interview is cancelled by user.
 */
export class InterviewCancelledError extends InterviewError {
	constructor(
		public readonly round: string,
		public readonly reason: string = 'User cancelled',
	) {
		super(`Interview cancelled during ${round}: ${reason}`)
		this.name = 'InterviewCancelledError'
	}
}

/**
 * Error thrown when investigation agent fails.
 */
export class InvestigationError extends InterviewError {
	constructor(
		public readonly query: string,
		public readonly details: string,
	) {
		super(`Investigation failed for "${query}": ${details}`)
		this.name = 'InvestigationError'
	}
}

/**
 * Error thrown when review agent fails.
 */
export class ReviewError extends InterviewError {
	constructor(public readonly details: string) {
		super(`Review failed: ${details}`)
		this.name = 'ReviewError'
	}
}
