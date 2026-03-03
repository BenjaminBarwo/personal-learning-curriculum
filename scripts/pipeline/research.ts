import { anthropic } from '../lib/anthropic.js'
import { withBackoff } from '../lib/retry.js'

interface ResearchTopicParams {
  topic: string
  pillarName: string
  courseName: string
  model: string
}

export async function researchTopic(params: ResearchTopicParams): Promise<string> {
  const { topic, pillarName, courseName, model } = params

  const userMessage = `Research the following topic for a lesson in the "${courseName}" course within the "${pillarName}" pillar.

Topic: ${topic}

Please gather:
1. 3-5 concrete real-world examples or case studies (with company names, dates, and outcomes where possible)
2. Key concepts and terminology that a learner must understand
3. Recent developments or trends (last 2-3 years) that make this topic relevant today
4. Cross-domain connections — how does this topic relate to adjacent fields like systems thinking, business strategy, human behavior, or technical implementation?
5. Common misconceptions or counterintuitive aspects that are worth addressing in the lesson

Focus on depth over breadth. A learner who understands these examples and connections will have a strong foundation for the lesson.`

  try {
    const response = await withBackoff(() =>
      anthropic.messages.create({
        model,
        max_tokens: 4096,
        tools: [
          {
            // Versioned tool name per Pitfall 6 in RESEARCH.md — avoids API deprecation errors
            type: 'web_search_20250305' as const,
            name: 'web_search',
            max_uses: 5,
          } as unknown as Parameters<typeof anthropic.messages.create>[0]['tools'][0],
        ],
        messages: [{ role: 'user', content: userMessage }],
      })
    )

    // Extract all text content from the response, including text after tool_result blocks
    const textParts: string[] = []
    for (const block of response.content) {
      if (block.type === 'text') {
        textParts.push(block.text)
      }
    }

    if (textParts.length === 0) {
      // Model may have only returned tool use blocks without a final text summary
      console.warn(`[research] No text content in response for topic: ${topic}`)
      return `Research notes unavailable for "${topic}". Use training knowledge to generate content.`
    }

    return textParts.join('\n\n')
  } catch (err: unknown) {
    // Check if the error is a tool-unavailability error (web_search not enabled for this key)
    const isToolError =
      err instanceof Error &&
      (err.message.includes('tool') ||
        err.message.includes('web_search') ||
        (err as { status?: number }).status === 400)

    if (isToolError) {
      console.warn(
        `[research] web_search tool unavailable — falling back to training knowledge. Error: ${err instanceof Error ? err.message : String(err)}`
      )
      // Return a graceful fallback so generation can still proceed
      return `Web search is unavailable for this API key. Generate content for "${topic}" using your training knowledge, focusing on well-established examples and principles from the ${pillarName} domain.`
    }

    // For other errors (network, 529, auth), re-throw so withBackoff and the orchestrator can handle
    throw err
  }
}
