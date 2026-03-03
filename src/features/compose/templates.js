import { drawSpacedText } from '../annotation/drawAnnotations'
import { WATERMARK_LETTER_SPACING } from '../../constants/layout'

/**
 * Draws a modern label tag at the given position (top-left anchored).
 */
function drawLabel(ctx, text, x, y, fontSize) {
  ctx.save()
  ctx.font = `600 ${fontSize}px "Nunito", sans-serif`
  ctx.textBaseline = 'middle'
  const metrics = ctx.measureText(text)
  const padX = fontSize * 0.6
  const padY = fontSize * 0.3
  const tagW = metrics.width + padX * 2
  const tagH = fontSize + padY * 2
  const r = fontSize * 0.3

  // Rounded rect background
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + tagW - r, y)
  ctx.arcTo(x + tagW, y, x + tagW, y + r, r)
  ctx.arcTo(x + tagW, y + tagH, x + tagW - r, y + tagH, r)
  ctx.lineTo(x + r, y + tagH)
  ctx.arcTo(x, y + tagH, x, y + tagH - r, r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
  ctx.fillStyle = 'rgba(0,0,0,0.60)'
  ctx.fill()

  // Text
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, x + padX, y + tagH / 2)
  ctx.restore()
}

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
 * Classic template: label tags at upper-left of each half + watermark centered at divider.
 */
function drawClassicOverlay(ctx, W, H, layoutMode, watermarkText, singleTarget, labels) {
  const labelFontSize = Math.round(W * 0.018)
  const wmFontSize = Math.round(W * 0.014)
  const margin = Math.round(W * 0.025)

  ctx.save()

  if (layoutMode === 'stacked') {
    const halfH = Math.floor(H / 2)
    // Before label — upper-left of top half
    drawLabel(ctx, labels.before, margin, margin, labelFontSize)
    // After label — upper-left of bottom half
    drawLabel(ctx, labels.after, margin, halfH + margin, labelFontSize)
    // Watermark — centered at the divider between the two halves
    if (watermarkText) {
      drawWatermarkBar(ctx, watermarkText.toUpperCase(), W / 2, halfH, wmFontSize)
    }
  } else if (layoutMode === 'sidebyside') {
    const halfW = Math.floor(W / 2)
    // Before label — upper-left of left half
    drawLabel(ctx, labels.before, margin, margin, labelFontSize)
    // After label — upper-left of right half
    drawLabel(ctx, labels.after, halfW + margin, margin, labelFontSize)
    // Watermark — centered at the vertical divider
    if (watermarkText) {
      // Rotate 90 degrees for vertical divider
      ctx.save()
      ctx.translate(halfW, H / 2)
      ctx.rotate(-Math.PI / 2)
      drawWatermarkBar(ctx, watermarkText.toUpperCase(), 0, 0, wmFontSize)
      ctx.restore()
    }
  } else if (layoutMode === 'single') {
    // Single: just watermark at bottom center
    if (watermarkText) {
      ctx.font = `600 ${wmFontSize}px "Nunito", sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.70)'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.4)'
      ctx.shadowBlur = 3
      drawSpacedText(ctx, watermarkText.toUpperCase(), W / 2, H - wmFontSize * 2, WATERMARK_LETTER_SPACING)
    }
  }

  ctx.restore()
}

/**
 * Elegant template: small uppercase labels + thin rule + provider name.
 */
function drawElegantOverlay(ctx, W, H, layoutMode, watermarkText, singleTarget, labels) {
  const labelSize = Math.round(W * 0.013)
  const wmSize = Math.round(W * 0.012)
  const labelSpacing = 2

  ctx.save()

  // Before/After labels — small uppercase at bottom of each region
  if (layoutMode === 'stacked') {
    const halfH = Math.floor(H / 2)
    ctx.font = `700 ${labelSize}px "Nunito", sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.textBaseline = 'middle'
    drawSpacedText(ctx, labels.before.toUpperCase(), W / 2, halfH - labelSize * 2, labelSpacing)
    drawSpacedText(ctx, labels.after.toUpperCase(), W / 2, H - labelSize * 2 - (watermarkText ? wmSize * 2.5 : 0), labelSpacing)
  } else if (layoutMode === 'sidebyside') {
    const halfW = Math.floor(W / 2)
    ctx.font = `700 ${labelSize}px "Nunito", sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.textBaseline = 'middle'
    drawSpacedText(ctx, labels.before.toUpperCase(), halfW / 2, H - labelSize * 2 - (watermarkText ? wmSize * 2.5 : 0), labelSpacing)
    drawSpacedText(ctx, labels.after.toUpperCase(), halfW + halfW / 2, H - labelSize * 2 - (watermarkText ? wmSize * 2.5 : 0), labelSpacing)
  }

  // Provider name with thin rule above
  if (watermarkText) {
    const ruleY = H - Math.round(W * 0.038)
    // Thin centered rule
    ctx.fillStyle = 'rgba(255,255,255,0.20)'
    ctx.fillRect(W * 0.35, ruleY, W * 0.30, 1)
    // Provider name below rule
    ctx.font = `600 ${wmSize}px "Nunito", sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.textBaseline = 'middle'
    drawSpacedText(ctx, watermarkText.toUpperCase(), W / 2, ruleY + wmSize * 1.4, WATERMARK_LETTER_SPACING)
  }

  ctx.restore()
}

export const TEMPLATES = [
  { id: 'classic', drawOverlay: drawClassicOverlay },
  { id: 'clean', drawOverlay: null },
  { id: 'elegant', drawOverlay: drawElegantOverlay },
]

export const DEFAULT_TEMPLATE = 'classic'

export function getTemplateById(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0]
}
