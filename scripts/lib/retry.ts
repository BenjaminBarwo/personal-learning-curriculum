import Anthropic from '@anthropic-ai/sdk'

export async function withBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      const isOverloaded =
        err instanceof Anthropic.APIError && err.status === 529
      if (!isOverloaded || attempt === maxAttempts) throw err
      const delayMs = 1000 * 2 ** (attempt - 1) // 1s, 2s, 4s
      console.warn(
        `[529 overloaded] Retry ${attempt}/${maxAttempts} in ${delayMs}ms`
      )
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw new Error('Unreachable')
}
