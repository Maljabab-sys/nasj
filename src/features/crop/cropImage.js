/**
 * Crops an image element to the given pixel crop rect.
 * Returns a dataURL (JPEG at 95% quality).
 */
export function cropImage(imgEl, pixelCrop) {
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    imgEl,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )
  return canvas.toDataURL('image/jpeg', 0.95)
}
