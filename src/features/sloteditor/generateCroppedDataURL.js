function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Given the raw image + pan/zoom state (with container dimensions),
 * render the visible viewport region as a JPEG dataURL.
 *
 * Uses object-contain logic: at scale=1 the full image is visible
 * (possibly with letterboxing). Zooming in crops to the visible region.
 */
export async function generateCroppedDataURL(rawDataURL, { scale = 1, offsetX = 0, offsetY = 0, containerW, containerH, bgColor = 'white' }) {
  const img = await loadImage(rawDataURL)
  const imgW = img.naturalWidth
  const imgH = img.naturalHeight

  const slotRatio = containerW && containerH ? containerW / containerH : 1
  const imgRatio = imgW / imgH

  // Object-contain fit: image fits WITHIN the container at scale=1
  let fitW, fitH
  if (imgRatio > slotRatio) {
    fitW = containerW
    fitH = containerW / imgRatio
  } else {
    fitH = containerH
    fitW = containerH * imgRatio
  }

  // Image display rectangle in container coords (center + offset + scale)
  const imgLeft   = containerW / 2 + offsetX - fitW * scale / 2
  const imgTop    = containerH / 2 + offsetY - fitH * scale / 2
  const imgRight  = imgLeft + fitW * scale
  const imgBottom = imgTop + fitH * scale

  // Visible portion = intersection of image rect with viewport [0,containerW]×[0,containerH]
  const visLeft   = Math.max(0, imgLeft)
  const visTop    = Math.max(0, imgTop)
  const visRight  = Math.min(containerW, imgRight)
  const visBottom = Math.min(containerH, imgBottom)

  // Source rectangle in native image pixels
  const srcX = ((visLeft - imgLeft) / (fitW * scale)) * imgW
  const srcY = ((visTop - imgTop) / (fitH * scale)) * imgH
  const srcW = ((visRight - visLeft) / (fitW * scale)) * imgW
  const srcH = ((visBottom - visTop) / (fitH * scale)) * imgH

  // Output canvas at high resolution matching slot aspect ratio
  const outputW = 1080
  const outputH = Math.round(outputW / slotRatio)
  const canvas = document.createElement('canvas')
  canvas.width = outputW
  canvas.height = outputH
  const ctx = canvas.getContext('2d')

  // Background fill (letterbox areas)
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor === 'white' ? '#ffffff' : '#0a0a0a'
    ctx.fillRect(0, 0, outputW, outputH)
  }

  // Destination rectangle on output canvas
  const dstX = (visLeft / containerW) * outputW
  const dstY = (visTop / containerH) * outputH
  const dstW = ((visRight - visLeft) / containerW) * outputW
  const dstH = ((visBottom - visTop) / containerH) * outputH

  if (srcW > 0 && srcH > 0 && dstW > 0 && dstH > 0) {
    ctx.drawImage(img, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH)
  }

  // Transparent → PNG, otherwise JPEG
  if (bgColor === 'transparent') {
    return canvas.toDataURL('image/png')
  }
  return canvas.toDataURL('image/jpeg', 0.95)
}
