import Anthropic from '@anthropic-ai/sdk'

let _instance: Anthropic | null = null

function getInstance(): Anthropic {
  if (!_instance) {
    _instance = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 3,
      timeout: 120_000,
    })
  }
  return _instance
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return Reflect.get(getInstance(), prop)
  },
})
