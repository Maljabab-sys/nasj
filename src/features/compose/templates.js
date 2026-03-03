import { drawSpacedText } from '../annotation/drawAnnotations'
import { WATERMARK_LETTER_SPACING } from '../../constants/layout'

/**
 * Draws the watermark bar centered at a given Y position.
 */
function drawWatermarkBar(ctx, text, cx, cy, fontSize) {
  ctx.save()
  ctx.font = `600 ${fontSize}px "Nunito", sans-serif`
  ctx.textBaseline = 'middle'
  const metrics = ctx.measureText(text)
  const padX = fontSize * 1.2
  const padY = fontSize * 0.4
  const barW = metrics.width + padX * 2
  const barH = fontSize + padY * 2
  const r = fontSize * 0.3

  // Rounded rect background
  const x = cx - barW / 2
  const y = cy - barH / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + barW - r, y)
  ctx.arcTo(x + barW, y, x + barW, y + r, r)
  ctx.arcTo(x + barW, y + barH, x + barW - r, y + barH, r)
  ctx.lineTo(x + r, y + barH)
  ctx.arcTo(x, y + barH, x, y + barH - r, r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
  ctx.fillStyle = 'rgba(0,0,0,0.60)'
  ctx.fill()

  // Text
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'center'
  ctx.fillText(text, cx, cy)
  ctx.restore()
}

/**
 * Classic template — watermark only (labels are now editable text strokes).
 */
function drawClassicWatermark(ctx, W, H, layoutMode, watermarkText) {
  if (!watermarkText) return
  const wmFontSize = Math.round(W * 0.014)

  ctx.save()

  if (layoutMode === 'stacked') {
    const halfH = Math.floor(H / 2)
    drawWatermarkBar(ctx, watermarkText.toUpperCase(), W / 2, halfH, wmFontSize)
  } else if (layoutMode === 'sidebyside') {
    const halfW = Math.floor(W / 2)
    ctx.save()
    ctx.translate(halfW, H / 2)
    ctx.rotate(-Math.PI / 2)
    drawWatermarkBar(ctx, watermarkText.toUpperCase(), 0, 0, wmFontSize)
    ctx.restore()
  } else if (layoutMode === 'single') {
    ctx.font = `600 ${wmFontSize}px "Nunito", sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.70)'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 3
    drawSpacedText(ctx, watermarkText.toUpperCase(), W / 2, H - wmFontSize * 2, WATERMARK_LETTER_SPACING)
  }

  ctx.restore()
}

/**
 * Elegant template — watermark only (labels are now editable text strokes).
 */
function drawElegantWatermark(ctx, W, H, layoutMode, watermarkText) {
  if (!watermarkText) return
  const wmSize = Math.round(W * 0.012)

  ctx.save()

  const ruleY = H - Math.round(W * 0.038)
  // Thin centered rule
  ctx.fillStyle = 'rgba(255,255,255,0.20)'
  ctx.fillRect(W * 0.35, ruleY, W * 0.30, 1)
  // Provider name below rule
  ctx.font = `600 ${wmSize}px "Nunito", sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.textBaseline = 'middle'
  drawSpacedText(ctx, watermarkText.toUpperCase(), W / 2, ruleY + wmSize * 1.4, WATERMARK_LETTER_SPACING)

  ctx.restore()
}

export const TEMPLATES = [
  { id: 'classic', drawWatermark: drawClassicWatermark },
  { id: 'clean', drawWatermark: null },
  { id: 'elegant', drawWatermark: drawElegantWatermark },
]

export const DEFAULT_TEMPLATE = 'classic'

export function getTemplateById(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0]
}
