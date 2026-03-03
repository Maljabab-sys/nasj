import { OUTPUT_SIZES } from '../../constants/layout'
import { drawAnnotationsOnto } from '../annotation/drawAnnotations'

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

async function drawStackedLayout(ctx, W, H, beforeURL, afterURL, beforeStrokes, afterStrokes) {
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
}

async function drawSideBySideLayout(ctx, W, H, beforeURL, afterURL, beforeStrokes, afterStrokes) {
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
}

async function drawSingleLayout(ctx, W, H, dataURL, strokes) {
  const img = await loadImage(dataURL)
  drawImageCover(ctx, img, 0, 0, W, H)
  drawAnnotationsOnto(ctx, strokes, 0, 0, W, H)
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
  outputSize,
  bgColor = 'white',
  templateId = 'classic',
  watermarkText = '',
  labels = { before: 'Before', after: 'After' },
}) {
  const { width: W, height: H } = OUTPUT_SIZES[outputSize] ?? OUTPUT_SIZES['1080x1080']
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background fill
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor === 'white' ? '#ffffff' : '#0a0a0a'
    ctx.fillRect(0, 0, W, H)
  }

  if (layoutMode === 'stacked') {
    await drawStackedLayout(ctx, W, H, beforeCropped, afterCropped, beforeStrokes, afterStrokes)
  } else if (layoutMode === 'sidebyside') {
    await drawSideBySideLayout(ctx, W, H, beforeCropped, afterCropped, beforeStrokes, afterStrokes)
  } else if (layoutMode === 'single') {
    const dataURL = singleTarget === 'before' ? beforeCropped : afterCropped
    const strokes = singleTarget === 'before' ? beforeStrokes : afterStrokes
    await drawSingleLayout(ctx, W, H, dataURL, strokes)
  }

  // Template labels + watermark are now editable text strokes, drawn with annotations above

  return canvas
}
