import { OUTPUT_SIZES, LABEL_PADDING, WATERMARK_LETTER_SPACING } from '../../constants/layout'
import { drawAnnotationsOnto, drawSpacedText } from '../annotation/drawAnnotations'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawImageCover(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.width, h / img.height)
  const scaledW = img.width * scale
  const scaledH = img.height * scale
  const offsetX = x + (w - scaledW) / 2
  const offsetY = y + (h - scaledH) / 2
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH)
  ctx.restore()
}

function drawLabel(ctx, text, x, y, fontSize = 22) {
  ctx.save()
  ctx.font = `bold ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.shadowColor = 'rgba(0,0,0,0.75)'
  ctx.shadowBlur = 5
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  ctx.fillText(text, x, y)
  ctx.restore()
}

function drawWatermark(ctx, text, cx, y, fontSize = 20) {
  ctx.save()
  ctx.font = `600 ${fontSize}px "Helvetica Neue", Helvetica, Arial, sans-serif`
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.shadowColor = 'rgba(0,0,0,0.65)'
  ctx.shadowBlur = 4
  ctx.shadowOffsetX = 1
  ctx.shadowOffsetY = 1
  drawSpacedText(ctx, text, cx, y, WATERMARK_LETTER_SPACING)
  ctx.restore()
}

async function drawStackedLayout(ctx, W, H, beforeURL, afterURL, beforeStrokes, afterStrokes, doctorName) {
  const halfH = Math.floor(H / 2)
  const [beforeImg, afterImg] = await Promise.all([loadImage(beforeURL), loadImage(afterURL)])

  // Draw images
  drawImageCover(ctx, beforeImg, 0, 0, W, halfH)
  drawAnnotationsOnto(ctx, beforeStrokes, 0, 0, W, halfH)

  drawImageCover(ctx, afterImg, 0, halfH, W, halfH)
  drawAnnotationsOnto(ctx, afterStrokes, 0, halfH, W, halfH)

  // Thin separator line
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(0, halfH - 1, W, 2)
  ctx.restore()

  // Labels
  drawLabel(ctx, '[Before] \u2190', LABEL_PADDING, LABEL_PADDING + 22)
  drawLabel(ctx, '[After] \u2192', LABEL_PADDING, halfH + LABEL_PADDING + 22)

  // Watermark at dividing line
  drawWatermark(ctx, doctorName, W / 2, halfH + 22)
}

async function drawSideBySideLayout(ctx, W, H, beforeURL, afterURL, beforeStrokes, afterStrokes, doctorName) {
  const halfW = Math.floor(W / 2)
  const [beforeImg, afterImg] = await Promise.all([loadImage(beforeURL), loadImage(afterURL)])

  drawImageCover(ctx, beforeImg, 0, 0, halfW, H)
  drawAnnotationsOnto(ctx, beforeStrokes, 0, 0, halfW, H)

  drawImageCover(ctx, afterImg, halfW, 0, halfW, H)
  drawAnnotationsOnto(ctx, afterStrokes, halfW, 0, halfW, H)

  // Thin separator
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(halfW - 1, 0, 2, H)
  ctx.restore()

  // Labels
  drawLabel(ctx, '[Before] \u2190', LABEL_PADDING, LABEL_PADDING + 22)
  drawLabel(ctx, '[After] \u2192', halfW + LABEL_PADDING, LABEL_PADDING + 22)

  // Watermark centered at bottom
  drawWatermark(ctx, doctorName, W / 2, H - LABEL_PADDING - 10)
}

async function drawSingleLayout(ctx, W, H, dataURL, strokes, doctorName, whichSide) {
  const img = await loadImage(dataURL)
  drawImageCover(ctx, img, 0, 0, W, H)
  drawAnnotationsOnto(ctx, strokes, 0, 0, W, H)

  const labelText = whichSide === 'before' ? '[Before] \u2190' : '[After] \u2192'
  drawLabel(ctx, labelText, LABEL_PADDING, LABEL_PADDING + 22)

  // Watermark in lower center
  drawWatermark(ctx, doctorName, W / 2, H * 0.72)
}

/**
 * Composites the final post image.
 * Returns a canvas element (call canvas.toDataURL('image/png') to get the image).
 */
export async function composite({
  beforeCropped,
  afterCropped,
  beforeStrokes,
  afterStrokes,
  layoutMode,
  singleTarget,
  doctorName,
  outputSize,
}) {
  const { width: W, height: H } = OUTPUT_SIZES[outputSize] ?? OUTPUT_SIZES['1080x1080']
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Black background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, W, H)

  if (layoutMode === 'stacked') {
    await drawStackedLayout(ctx, W, H, beforeCropped, afterCropped, beforeStrokes, afterStrokes, doctorName)
  } else if (layoutMode === 'sidebyside') {
    await drawSideBySideLayout(ctx, W, H, beforeCropped, afterCropped, beforeStrokes, afterStrokes, doctorName)
  } else if (layoutMode === 'single') {
    const dataURL = singleTarget === 'before' ? beforeCropped : afterCropped
    const strokes = singleTarget === 'before' ? beforeStrokes : afterStrokes
    await drawSingleLayout(ctx, W, H, dataURL, strokes, doctorName, singleTarget)
  }

  return canvas
}
