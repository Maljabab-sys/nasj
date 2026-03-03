import { useState, useCallback, useRef, useEffect } from 'react'
import { downscaleImage } from '../../utils/downscaleImage'

const TIMEOUT_MS = 90_000 // 90s hard timeout

export function useImageGenerator() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [batchProgress, setBatchProgress] = useState(null) // { done: N, total: N } | null
  const timerRef = useRef(null)
  const abortRef = useRef(null)

  // Tick elapsed every second while loading
  useEffect(() => {
    if (isLoading) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [isLoading])

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const generate = useCallback(async ({ prompt, model, image, format }) => {
    if (!prompt?.trim()) return null
    setIsLoading(true)
    setError(null)

    // Abort any previous in-flight request
    cancel()
    const controller = new AbortController()
    abortRef.current = controller

    // Auto-timeout after 90s
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      // Downscale reference image to 512px before sending — cuts payload ~90%
      let optimizedImage = image
      if (image && typeof image === 'string' && image.startsWith('data:')) {
        try {
          optimizedImage = await downscaleImage(image, 512, 0.75)
        } catch {
          optimizedImage = image
        }
      }

      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), model, image: optimizedImage, format }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `API error: ${res.status}`)
      }

      const data = await res.json()
      return { imageDataURL: data.imageDataURL, textOverlays: data.textOverlays || [] }
    } catch (err) {
      if (err.name === 'AbortError') {
        const msg = 'Request cancelled or timed out (90s). Try again — Flash is usually faster.'
        console.warn('[ImageGenerator]', msg)
        setError(msg)
        return null
      }
      console.error('[ImageGenerator]', err.message)
      setError(err.message)
      return null
    } finally {
      clearTimeout(timeoutId)
      abortRef.current = null
      setIsLoading(false)
    }
  }, [cancel])

  // Generate images for multiple posts in parallel, calling onEach as each completes
  // posts: [{ format: 'square'|'portrait'|'story', postType: 'single'|'beforeafter' }]
  const generateBatch = useCallback(async ({ prompt, model, image, posts: batchPosts, onEach }) => {
    const count = batchPosts?.length || 0
    if (!prompt?.trim() || count < 1) return
    setIsLoading(true)
    setError(null)
    setBatchProgress({ done: 0, total: count })

    cancel()
    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS * 2) // double timeout for batch

    let optimizedImage = image
    if (image && typeof image === 'string' && image.startsWith('data:')) {
      try { optimizedImage = await downscaleImage(image, 512, 0.75) } catch { optimizedImage = image }
    }

    let done = 0
    let lastError = null

    const tasks = batchPosts.map((post, i) =>
      fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), model, image: optimizedImage, format: post.format }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const d = await res.json().catch(() => ({}))
            throw new Error(d.error || `API error: ${res.status}`)
          }
          const data = await res.json()
          done++
          setBatchProgress({ done, total: count })
          onEach?.(i, { imageDataURL: data.imageDataURL, textOverlays: data.textOverlays || [] })
        })
        .catch((err) => {
          done++
          setBatchProgress({ done, total: count })
          if (err.name !== 'AbortError') {
            lastError = err.message
            console.error(`[ImageGenerator] Batch item ${i} failed:`, err.message)
          }
        })
    )

    try {
      await Promise.all(tasks)
      if (lastError) setError(lastError)
      if (controller.signal.aborted) {
        setError('Batch cancelled or timed out.')
      }
    } finally {
      clearTimeout(timeoutId)
      abortRef.current = null
      setIsLoading(false)
      setBatchProgress(null)
    }
  }, [cancel])

  const clearError = useCallback(() => setError(null), [])

  return { generate, generateBatch, isLoading, error, clearError, elapsed, cancel, batchProgress }
}
