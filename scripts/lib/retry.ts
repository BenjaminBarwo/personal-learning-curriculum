import Anthropic from '@anthropic-ai/sdk'

export async function withBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const isRetryable =
        err instanceof Anthropic.APIError && (err.status === 529 || err.status === 429)
      if (!isRetryable || attempt === maxAttempts) throw err

      // 429 rate limit: wait longer (30s, 60s, 120s, 240s)
      // 529 overloaded: shorter backoff (1s, 2s, 4s, 8s)
      const baseMs = err.status === 429 ? 30_000 : 1_000
      const delayMs = baseMs * 2 ** (attempt - 1)
      console.warn(
        `[${err.status} ${err.status === 429 ? 'rate limit' : 'overloaded'}] Retry ${attempt}/${maxAttempts} in ${Math.round(delayMs / 1000)}s`
      )
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw new Error('Unreachable')
}
