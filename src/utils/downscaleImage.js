/**
 * Downscale a base64 data-URL image to a maximum dimension.
 * Returns a smaller JPEG data-URL — dramatically reduces payload to the AI API.
 *
 * @param {string}  dataURL    – original data:image/…;base64,… string
 * @param {number}  [maxPx=512] – longest side will be capped to this
 * @param {number}  [quality=0.8] – JPEG quality 0–1
 * @returns {Promise<string>}   – compressed data-URL (JPEG)
 */
export function downscaleImage(dataURL, maxPx = 512, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img

      // Only downscale if larger than maxPx
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error('Failed to load image for downscaling'))
    img.src = dataURL
  })
}
