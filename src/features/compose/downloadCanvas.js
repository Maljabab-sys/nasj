import JSZip from 'jszip'

/**
 * Triggers a browser download of the canvas as a PNG file.
 */
export function downloadCanvas(canvas, filename = 'ortho-post.png') {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Downloads multiple canvases as a ZIP file.
 * @param {Array<{canvas: HTMLCanvasElement, filename: string}>} items
 * @param {string} zipFilename
 */
export async function downloadAllAsZip(items, zipFilename = 'nasj-posts.zip') {
  const zip = new JSZip()

  for (const { canvas, filename } of items) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    zip.file(filename, blob)
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const link = document.createElement('a')
  link.download = zipFilename
  link.href = url
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
