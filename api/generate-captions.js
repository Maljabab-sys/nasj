import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'

const anthropic = new Anthropic()
const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

const PLATFORM_INSTRUCTIONS = {
  instagram: {
    name: 'Instagram',
    captionStyle: '2–4 sentences, professional yet engaging.',
    emojiCount: '1–3 emojis per caption',
    hashtagCount: '15–20 hashtags',
    note: '',
  },
  tiktok: {
    name: 'TikTok',
    captionStyle: '1–2 short punchy sentences with a hook. Use trending expressions. Feel energetic and youthful.',
    emojiCount: '2–5 emojis per caption',
    hashtagCount: '5–10 hashtags',
    note: 'TikTok captions should have a strong opening hook to grab attention immediately.',
  },
  snapchat: {
    name: 'Snapchat',
    captionStyle: '1 very short casual sentence (max 80 characters). Conversational and fun.',
    emojiCount: '1–2 emojis per caption',
    hashtagCount: '0–3 hashtags',
    note: 'Snapchat captions are minimal — skip hashtags if they feel unnatural.',
  },
  twitter: {
    name: 'Twitter / X',
    captionStyle: '1 punchy sentence under 220 characters total (leave room for hashtags). Direct and impactful.',
    emojiCount: '0–2 emojis per caption',
    hashtagCount: '1–3 hashtags only',
    note: 'Twitter/X has a 280-character limit — keep the entire caption short.',
  },
}

function buildSystemPrompt(lang, target, platform, accent) {
  const isArabic = lang === 'ar'
  const p = PLATFORM_INSTRUCTIONS[platform] || PLATFORM_INSTRUCTIONS.instagram
  const accentNote = ACCENT_INSTRUCTIONS[accent] || ''

  const captionRules = `- ${isArabic ? 'Write captions in Arabic.' : 'Write captions in English.'}
- Platform: ${p.name}. ${p.captionStyle}
- Include relevant emojis (${p.emojiCount}).
- Each caption must have a different tone: (1) professional/educational, (2) warm/friendly, (3) motivational/aspirational.
${accentNote ? `- IMPORTANT — Dialect rule (applies to ALL 3 captions, including the professional one): ${accentNote}\n` : ''}${p.note ? `- ${p.note}\n` : ''}- CRITICAL: Only use real, commonly used words. Never invent, fabricate, or transliterate words. If you are unsure about a word, use a simpler alternative.${isArabic ? ' For technical/foreign terms, use the widely accepted Arabic equivalent or keep the English term as-is.' : ''}`

  const hashtagRules = `- Hashtags should be relevant to the content described by the user.
- Mix popular broad hashtags with niche-specific ones.
- All hashtags must start with #. No duplicates.`

  const role = `You are an expert social media content writer who creates engaging ${p.name} captions and hashtags.`

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
- The JSON must have exactly one key: "hashtags" (array of ${p.hashtagCount.replace('–', '–')} strings).
${hashtagRules}`
  }

  return `${role}

Rules:
- Return ONLY valid JSON. No markdown fences, no explanation, no extra text.
- The JSON must have exactly two keys: "captions" (array of exactly 3 strings) and "hashtags" (array of ${p.hashtagCount} strings).
${captionRules}
${hashtagRules}`
}

const ACCENT_INSTRUCTIONS = {
  neutral: '',
  saudi: 'Write in Saudi Arabian dialect and cultural style. Use well-known Saudi expressions (e.g. يعطيك العافية, ما شاء الله, الله يسعدك). Keep technical terms in their original English form (e.g. aligners, braces) rather than inventing Arabic transliterations.',
  gulf: 'Write in Gulf/Khaleeji dialect and cultural style. Use well-known Gulf expressions. Keep technical terms in their original English form rather than inventing Arabic transliterations.',
  egyptian: 'Write in Egyptian dialect and cultural style. Use well-known Egyptian expressions (e.g. تحفة, جامد, يا سلام). Keep technical terms in their original English form rather than inventing Arabic transliterations.',
}

function buildUserPrompt({ description, lang, accent, target, platform, hasImages }) {
  const isArabic = lang === 'ar'
  const langNote = isArabic
    ? 'Write captions in Arabic.'
    : 'Write captions in English.'

  const accentNote = ACCENT_INSTRUCTIONS[accent] || ''
  const p = PLATFORM_INSTRUCTIONS[platform] || PLATFORM_INSTRUCTIONS.instagram

  let whatToGenerate, jsonShape
  if (target === 'captions') {
    whatToGenerate = `3 ${p.name} captions`
    jsonShape = '{"captions": ["...", "...", "..."]}'
  } else if (target === 'hashtags') {
    whatToGenerate = `${p.hashtagCount} hashtags for ${p.name}`
    jsonShape = '{"hashtags": ["#...", "#...", ...]}'
  } else {
    whatToGenerate = `3 ${p.name} captions and ${p.hashtagCount} hashtags`
    jsonShape = '{"captions": ["...", "...", "..."], "hashtags": ["#...", "#...", ...]}'
  }

  const imageContext = hasImages
    ? '\n\nI have attached photos. Carefully analyze the images and write captions that accurately describe what you see in them. Base the captions on the actual visual content of the photos.'
    : ''

  return `Generate ${whatToGenerate} based on the following description:

"${description}"${imageContext}

Language: ${langNote}${accentNote ? `\nStyle: ${accentNote}` : ''}

Return JSON only: ${jsonShape}`
}

// ── Parse data URL into mimeType + base64 ────────────────────────────────────
function parseDataURL(dataURL) {
  if (!dataURL || typeof dataURL !== 'string') return null
  const match = dataURL.match(/^data:(image\/[^;]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], data: match[2] }
}

// ── Provider: Claude ──────────────────────────────────────────────────────────
async function callClaude(systemPrompt, userPrompt, maxTokens, model = 'claude-sonnet-4-6', images = []) {
  const content = []
  for (const img of images) {
    const parsed = parseDataURL(img)
    if (parsed) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: parsed.mimeType, data: parsed.data },
      })
    }
  }
  content.push({ type: 'text', text: userPrompt })

  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  })
  return message.content[0].text
}

// ── Provider: Gemini ──────────────────────────────────────────────────────────
async function callGemini(systemPrompt, userPrompt, images = []) {
  const contents = []
  for (const img of images) {
    const parsed = parseDataURL(img)
    if (parsed) {
      contents.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } })
    }
  }
  contents.push({ text: userPrompt })

  const response = await gemini.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  })
  return response.text
}

// ── Extract JSON from raw text ────────────────────────────────────────────────
function extractJSON(rawText) {
  let text = rawText.trim()
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
  if (fenceMatch) text = fenceMatch[1].trim()
  if (!text.startsWith('{')) {
    const braceMatch = text.match(/\{[\s\S]*\}/)
    if (braceMatch) text = braceMatch[0]
  }
  // Fix trailing commas before ] or } (common LLM output error)
  text = text.replace(/,\s*([\]}])/g, '$1')
  return JSON.parse(text)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { description, lang, accent, target, platform, provider, images } = req.body
  const validTarget = ['captions', 'hashtags', 'both'].includes(target) ? target : 'both'
  const validPlatform = ['instagram', 'tiktok', 'snapchat', 'twitter'].includes(platform) ? platform : 'instagram'
  const validProvider = ['claude', 'haiku', 'gemini'].includes(provider) ? provider : 'claude'
  const validImages = Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.startsWith('data:image/')) : []
  const hasImages = validImages.length > 0

  if ((!description || !description.trim()) && !hasImages) {
    return res.status(400).json({ error: 'Missing required field: description or images' })
  }

  // Check Gemini API key availability
  if (validProvider === 'gemini' && !process.env.GOOGLE_AI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured. Set GOOGLE_AI_API_KEY.' })
  }

  const systemPrompt = buildSystemPrompt(lang || 'en', validTarget, validPlatform, accent || 'neutral')
  const desc = (description && description.trim()) || (hasImages ? 'Describe what you see in the attached photos' : '')
  const userPrompt = buildUserPrompt({ description: desc, lang: lang || 'en', accent: accent || 'neutral', target: validTarget, platform: validPlatform, hasImages })
  const maxTokens = validTarget === 'both' ? 2048 : 1024

  try {
    const rawText = validProvider === 'gemini'
      ? await callGemini(systemPrompt, userPrompt, validImages)
      : await callClaude(systemPrompt, userPrompt, maxTokens,
          validProvider === 'haiku' ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-4-6',
          validImages)

    const parsed = extractJSON(rawText)

    // Build response based on what was requested
    const result = {}
    if (validTarget !== 'hashtags') {
      if (!Array.isArray(parsed.captions)) throw new Error('Invalid response: missing captions')
      result.captions = parsed.captions.slice(0, 3)
    }
    if (validTarget !== 'captions') {
      if (!Array.isArray(parsed.hashtags)) throw new Error('Invalid response: missing hashtags')
      const maxHashtags = validPlatform === 'twitter' ? 3 : validPlatform === 'snapchat' ? 3 : validPlatform === 'tiktok' ? 10 : 20
      result.hashtags = parsed.hashtags.slice(0, maxHashtags)
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Caption generation error:', err)

    let detail = err.message || 'Unknown error'
    let status = 500

    // Anthropic SDK errors
    if (err.status === 401) {
      detail = validProvider === 'gemini' ? 'Invalid Google AI API key.' : 'Invalid API key. Check ANTHROPIC_API_KEY.'
      status = 401
    } else if (err.status === 429) {
      detail = 'Rate limited. Please wait a moment and try again.'
      status = 429
    } else if (err.status === 529 || err.status === 503) {
      detail = 'API is temporarily overloaded. Try again shortly.'
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
