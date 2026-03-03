import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

function buildSystemPrompt(lang, target) {
  const isArabic = lang === 'ar'

  const captionRules = `- ${isArabic ? 'Write captions in Arabic.' : 'Write captions in English.'}
- Captions should be 2–4 sentences, professional yet engaging for Instagram.
- Include relevant emojis sparingly (1–3 per caption).
- Each caption must have a different tone: (1) professional/educational, (2) warm/friendly, (3) motivational/aspirational.
- CRITICAL: Only use real, commonly used words. Never invent, fabricate, or transliterate words. If you are unsure about a word, use a simpler alternative.${isArabic ? ' For technical/foreign terms, use the widely accepted Arabic equivalent or keep the English term as-is.' : ''}`

  const hashtagRules = `- Hashtags should be relevant to the content described by the user.
- Mix popular broad hashtags with niche-specific ones.
- All hashtags must start with #. No duplicates.`

  const role = 'You are an expert social media content writer who creates engaging Instagram captions and hashtags.'

  if (target === 'captions') {
    return `${role}

Rules:
- Return ONLY valid JSON. No markdown fences, no explanation, no extra text.
- The JSON must have exactly one key: "captions" (array of exactly 3 strings).
${captionRules}`
  }

  if (target === 'hashtags') {
    return `${role}

Rules:
- Return ONLY valid JSON. No markdown fences, no explanation, no extra text.
- The JSON must have exactly one key: "hashtags" (array of 15–20 strings).
${hashtagRules}`
  }

  return `${role}

Rules:
- Return ONLY valid JSON. No markdown fences, no explanation, no extra text.
- The JSON must have exactly two keys: "captions" (array of exactly 3 strings) and "hashtags" (array of 15–20 strings).
${captionRules}
${hashtagRules}`
}

const ACCENT_INSTRUCTIONS = {
  neutral: '',
  saudi: 'Write in Saudi Arabian dialect and cultural style. Use well-known Saudi expressions (e.g. يعطيك العافية, ما شاء الله, الله يسعدك). Keep technical terms in their original English form (e.g. aligners, braces) rather than inventing Arabic transliterations.',
  gulf: 'Write in Gulf/Khaleeji dialect and cultural style. Use well-known Gulf expressions. Keep technical terms in their original English form rather than inventing Arabic transliterations.',
  egyptian: 'Write in Egyptian dialect and cultural style. Use well-known Egyptian expressions (e.g. تحفة, جامد, يا سلام). Keep technical terms in their original English form rather than inventing Arabic transliterations.',
}

function buildUserPrompt({ description, lang, accent, target }) {
  const isArabic = lang === 'ar'
  const langNote = isArabic
    ? 'Write captions in Arabic.'
    : 'Write captions in English.'

  const accentNote = ACCENT_INSTRUCTIONS[accent] || ''

  let whatToGenerate, jsonShape
  if (target === 'captions') {
    whatToGenerate = '3 Instagram captions'
    jsonShape = '{"captions": ["...", "...", "..."]}'
  } else if (target === 'hashtags') {
    whatToGenerate = '15–20 hashtags'
    jsonShape = '{"hashtags": ["#...", "#...", ...]}'
  } else {
    whatToGenerate = '3 Instagram captions and 15–20 hashtags'
    jsonShape = '{"captions": ["...", "...", "..."], "hashtags": ["#...", "#...", ...]}'
  }

  return `Generate ${whatToGenerate} based on the following description:

"${description}"

Language: ${langNote}${accentNote ? `\nStyle: ${accentNote}` : ''}

Return JSON only: ${jsonShape}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { description, lang, accent, target } = req.body
  const validTarget = ['captions', 'hashtags', 'both'].includes(target) ? target : 'both'

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Missing required field: description' })
  }

  const systemPrompt = buildSystemPrompt(lang || 'en', validTarget)
  const userPrompt = buildUserPrompt({ description: description.trim(), lang: lang || 'en', accent: accent || 'neutral', target: validTarget })

  // Use fewer tokens when only generating one piece
  const maxTokens = validTarget === 'both' ? 1024 : 512

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].text

    // Strip markdown fences (```json ... ``` or ``` ... ```) if present
    let text = rawText.trim()
    const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
    if (fenceMatch) text = fenceMatch[1].trim()

    // As a fallback, extract the first { ... } block
    if (!text.startsWith('{')) {
      const braceMatch = text.match(/\{[\s\S]*\}/)
      if (braceMatch) text = braceMatch[0]
    }

    const parsed = JSON.parse(text)

    // Build response based on what was requested
    const result = {}
    if (validTarget !== 'hashtags') {
      if (!Array.isArray(parsed.captions)) throw new Error('Invalid response: missing captions')
      result.captions = parsed.captions.slice(0, 3)
    }
    if (validTarget !== 'captions') {
      if (!Array.isArray(parsed.hashtags)) throw new Error('Invalid response: missing hashtags')
      result.hashtags = parsed.hashtags.slice(0, 20)
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Caption generation error:', err)

    let detail = err.message || 'Unknown error'
    let status = 500

    // Anthropic SDK errors have a status property
    if (err.status === 401) {
      detail = 'Invalid API key. Check ANTHROPIC_API_KEY.'
      status = 401
    } else if (err.status === 429) {
      detail = 'Rate limited. Please wait a moment and try again.'
      status = 429
    } else if (err.status === 529 || err.status === 503) {
      detail = 'Anthropic API is temporarily overloaded. Try again shortly.'
      status = 503
    } else if (err.name === 'SyntaxError') {
      detail = 'AI returned invalid JSON. Please try again.'
    } else if (detail.includes('timeout') || detail.includes('ETIMEDOUT') || detail.includes('ECONNRESET')) {
      detail = 'Request timed out. Try again.'
      status = 504
    }

    return res.status(status).json({ error: detail })
  }
}
