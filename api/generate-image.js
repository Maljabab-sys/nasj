import { GoogleGenAI } from '@google/genai'

const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

// ── Model registry ──────────────────────────────────────────────────────────
// Two families: "gemini" (generateContent) and "imagen" (generateImages)
const MODELS = {
  'gemini-3-pro-image-preview':     { type: 'gemini' },
  'gemini-3.1-flash-image-preview': { type: 'gemini' },
  'gemini-2.5-flash-image':         { type: 'gemini' },
  'imagen-4.0-fast-generate-001':   { type: 'imagen' },
}

const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview'

const TEXT_OVERLAY_INSTRUCTION = `

If you include any text, labels, titles, or captions in the generated image, also return a JSON block in your text response with this exact format:
{"textOverlays": [{"text": "The text content", "position": "top-center", "fontSize": "large", "color": "#ffffff"}]}

Valid positions: "top-left", "top-center", "top-right", "center-left", "center", "center-right", "bottom-left", "bottom-center", "bottom-right"
Valid fontSize: "small", "medium", "large"
If there is no text to overlay, return: {"textOverlays": []}`

// ── Aspect ratio mapping ─────────────────────────────────────────────────────
// Maps app format names to API aspect ratio strings
const FORMAT_TO_RATIO = {
  square:   '1:1',
  portrait: '4:5',   // Instagram portrait — closest supported ratio
  story:    '9:16',
}

// ── Gemini native path (generateContent) ────────────────────────────────────
async function generateWithGemini(selectedModel, prompt, image, aspectRatio = '1:1') {
  const wantsText = /\b(text|label|title|caption|write|heading|watermark|overlay)\b/i.test(prompt)
  const fullPrompt = wantsText
    ? prompt.trim() + TEXT_OVERLAY_INSTRUCTION
    : prompt.trim()

  const contents = [{ text: fullPrompt }]

  if (image && typeof image === 'string' && image.startsWith('data:')) {
    const match = image.match(/^data:(image\/[^;]+);base64,(.+)$/)
    if (match) {
      contents.push({ inlineData: { mimeType: match[1], data: match[2] } })
    }
  }

  const modalities = wantsText ? ['Text', 'Image'] : ['Image']
  const isFlash = selectedModel.includes('flash')
  const imageSize = isFlash ? '512px' : '1K'
  // thinkingConfig only supported on 3.x models, not on 2.5
  const supportsThinking = selectedModel.startsWith('gemini-3')

  console.log(`[ImageGen] Gemini model=${selectedModel} hasImage=${contents.length > 1} modalities=${modalities} imageSize=${imageSize} thinking=${supportsThinking} ratio=${aspectRatio}`)
  const t0 = Date.now()

  const config = {
    responseModalities: modalities,
    imageConfig: { aspectRatio, imageSize },
  }
  if (supportsThinking) {
    config.thinkingConfig = { thinkingLevel: 'minimal' }
  }

  const response = await gemini.models.generateContent({
    model: selectedModel,
    contents,
    config,
  })

  console.log(`[ImageGen] Gemini API responded in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  const parts = response.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith('image/'))

  if (!imagePart) {
    throw Object.assign(new Error('AI did not return an image. Try a different prompt.'), { status: 500 })
  }

  const dataURL = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`

  // Extract text overlays
  let textOverlays = []
  if (wantsText) {
    const combinedText = parts.filter((p) => p.text).map((p) => p.text).join('\n')
    try {
      const jsonMatch = combinedText.match(/\{[\s\S]*"textOverlays"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed.textOverlays)) textOverlays = parsed.textOverlays
      }
    } catch { /* ignore parse errors */ }
  }

  console.log(`[ImageGen] Gemini done. overlays=${textOverlays.length} totalMs=${Date.now() - t0}`)
  return { imageDataURL: dataURL, textOverlays }
}

// ── Imagen path (generateImages — text-to-image only) ───────────────────────
// Imagen only supports: 1:1, 9:16, 16:9, 4:3, 3:4
const IMAGEN_RATIO_FALLBACK = { '4:5': '3:4' }

async function generateWithImagen(selectedModel, prompt, aspectRatio = '1:1') {
  const imagenRatio = IMAGEN_RATIO_FALLBACK[aspectRatio] || aspectRatio
  console.log(`[ImageGen] Imagen model=${selectedModel} ratio=${aspectRatio}→${imagenRatio}`)
  const t0 = Date.now()

  const response = await gemini.models.generateImages({
    model: selectedModel,
    prompt: prompt.trim(),
    config: {
      numberOfImages: 1,
      aspectRatio: imagenRatio,
    },
  })

  console.log(`[ImageGen] Imagen API responded in ${((Date.now() - t0) / 1000).toFixed(1)}s`)

  const generated = response.generatedImages?.[0]
  if (!generated?.image?.imageBytes) {
    throw Object.assign(new Error('Imagen did not return an image. Try a different prompt.'), { status: 500 })
  }

  const dataURL = `data:image/png;base64,${generated.image.imageBytes}`
  console.log(`[ImageGen] Imagen done. totalMs=${Date.now() - t0}`)
  return { imageDataURL: dataURL, textOverlays: [] }
}

// ── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { prompt, model, image, format } = req.body
  const aspectRatio = FORMAT_TO_RATIO[format] || '1:1'

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Missing required field: prompt' })
  }

  if (!process.env.GOOGLE_AI_API_KEY) {
    return res.status(500).json({ error: 'Google AI API key not configured. Set GOOGLE_AI_API_KEY.' })
  }

  let selectedModel = MODELS[model] ? model : DEFAULT_MODEL
  const hasImage = image && typeof image === 'string' && image.startsWith('data:')

  // Imagen doesn't support reference images — fall back to Gemini 2.5 Flash
  if (MODELS[selectedModel]?.type === 'imagen' && hasImage) {
    console.log(`[ImageGen] Imagen + ref image → falling back to gemini-2.5-flash-image`)
    selectedModel = 'gemini-2.5-flash-image'
  }

  const modelInfo = MODELS[selectedModel]

  try {
    let result
    if (modelInfo.type === 'imagen') {
      result = await generateWithImagen(selectedModel, prompt, aspectRatio)
    } else {
      result = await generateWithGemini(selectedModel, prompt, image, aspectRatio)
    }

    return res.status(200).json(result)
  } catch (err) {
    console.error('Image generation error:', err)

    let detail = err.message || 'Unknown error'
    let status = err.status || 500

    if (err.status === 401) {
      detail = 'Invalid Google AI API key.'
      status = 401
    } else if (err.status === 429) {
      detail = 'Rate limited. Please wait a moment and try again.'
      status = 429
    } else if (err.status === 503 || err.status === 529) {
      detail = 'API is temporarily overloaded. Try again shortly.'
      status = 503
    } else if (detail.includes('timeout') || detail.includes('ETIMEDOUT') || detail.includes('ECONNRESET')) {
      detail = 'Request timed out. Try again.'
      status = 504
    }

    return res.status(status).json({ error: detail })
  }
}
