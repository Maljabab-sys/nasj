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
