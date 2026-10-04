/**
 * Optional one-click AI report using the person's own Anthropic API key.
 * The SDK is loaded lazily so it isn't part of the main bundle.
 */
export async function generateAiReport(apiKey: string, prompt: string): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  // The key is entered by the user and stored only in this browser.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    output_config: { effort: 'medium' },
    // If the model declines, the API retries on a suitable fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content: prompt }],
  })
  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined to write this report. Try the copy-and-paste option instead.')
  }
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim()
  if (!text) throw new Error('The API returned an empty report.')
  return text
}
