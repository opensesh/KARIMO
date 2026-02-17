/**
 * KARIMO Doctor Check: Anthropic API Key
 *
 * Verifies that ANTHROPIC_API_KEY environment variable is set.
 * Does NOT validate the key by making API calls.
 */

import type { CheckResult } from '../types'

/**
 * Check if ANTHROPIC_API_KEY is set.
 */
export async function checkAnthropicApiKey(_projectRoot: string): Promise<CheckResult> {
  const apiKey = process.env['ANTHROPIC_API_KEY']

  if (apiKey && apiKey.trim().length > 0) {
    // Mask the key for display
    const masked = apiKey.slice(0, 7) + '...' + apiKey.slice(-4)

    return {
      name: 'anthropic_api_key',
      label: 'Anthropic API key',
      status: 'pass',
      version: `Set (${masked})`,
    }
  }

  return {
    name: 'anthropic_api_key',
    label: 'Anthropic API key',
    status: 'fail',
    message: 'Not set',
    fix: `Add to your shell config:

   export ANTHROPIC_API_KEY="sk-ant-..."

   Get a key from: https://console.anthropic.com`,
  }
}
