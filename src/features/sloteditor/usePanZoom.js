import { useRef, useCallback, useEffect } from 'react'

const MIN_SCALE = 0.3
const MAX_SCALE = 5.0
const ZOOM_SPEED = 0.002

/**
 * Clamp offset so the image stays mostly visible when dragged.
 * Allows free repositioning — container overflow-hidden clips naturally.
 * At least 20% of the smaller dimension stays in view.
 */
function clampOffset(offset, scale, containerSize, imgFitSize) {
  const scaledSize = imgFitSize * scale
  const minVisible = Math.min(scaledSize, containerSize) * 0.2
  const maxOffset = (scaledSize + containerSize) / 2 - minVisible
  return Math.max(-maxOffset, Math.min(maxOffset, offset))
}

/**
 * Given image natural dimensions and a container,
 * compute the "object-contain" fit dimensions (how big the image is at scale=1).
 */
function computeFit(imgW, imgH, containerW, containerH) {
  const containerRatio = containerW / containerH
  const imgRatio = imgW / imgH
  if (imgRatio > containerRatio) {
    // Image is wider → width fills, height has letterbox
    const fitW = containerW
    const fitH = fitW / imgRatio
    return { fitW, fitH }
  } else {
    // Image is taller → height fills, width has letterbox
    const fitH = containerH
    const fitW = fitH * imgRatio
    return { fitW, fitH }
  }
}

export function usePanZoom({ containerRef, imgNaturalW, imgNaturalH, scale, offsetX, offsetY, onUpdate, enabled }) {
  const panningRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const pinchRef = useRef({ dist: 0, scale: 1, ox: 0, oy: 0 })

  const getFit = useCallback(() => {
    const el = containerRef.current
    if (!el || !imgNaturalW || !imgNaturalH) return null
    const rect = el.getBoundingClientRect()
    return { ...computeFit(imgNaturalW, imgNaturalH, rect.width, rect.height), cW: rect.width, cH: rect.height }
  }, [containerRef, imgNaturalW, imgNaturalH])

  const clamp = useCallback((s, ox, oy) => {
    const fit = getFit()
    if (!fit) return { scale: s, offsetX: ox, offsetY: oy }
    const cs = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))
    return {
      scale: cs,
      offsetX: clampOffset(ox, cs, fit.cW, fit.fitW),
      offsetY: clampOffset(oy, cs, fit.cH, fit.fitH),
    }
  }, [getFit])

  // ── Mouse pan ──────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    panningRef.current = true
    startRef.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY }
  }, [enabled, offsetX, offsetY])

  const onMouseMove = useCallback((e) => {
    if (!panningRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    onUpdate(clamp(scale, startRef.current.ox + dx, startRef.current.oy + dy))
  }, [scale, onUpdate, clamp])

  const onMouseUp = useCallback(() => { panningRef.current = false }, [])

  // ── Wheel zoom (always active, regardless of mode) ─────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function handleWheel(e) {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const pointerX = e.clientX - rect.left - rect.width / 2
      const pointerY = e.clientY - rect.top - rect.height / 2
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * (1 - e.deltaY * ZOOM_SPEED)))
      const ratio = newScale / scale
      const newOX = pointerX - ratio * (pointerX - offsetX)
      const newOY = pointerY - ratio * (pointerY - offsetY)
      onUpdate(clamp(newScale, newOX, newOY))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [containerRef, scale, offsetX, offsetY, onUpdate, clamp])

  // ── Touch pan + pinch zoom ─────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    if (!enabled) return
    if (e.touches.length === 1) {
      panningRef.current = true
      startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offsetX, oy: offsetY }
    } else if (e.touches.length === 2) {
      panningRef.current = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchRef.current = { dist: Math.hypot(dx, dy), scale, ox: offsetX, oy: offsetY }
    }
  }, [enabled, offsetX, offsetY, scale])

  const onTouchMove = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    if (e.touches.length === 1 && panningRef.current) {
      const dx = e.touches[0].clientX - startRef.current.x
      const dy = e.touches[0].clientY - startRef.current.y
      onUpdate(clamp(scale, startRef.current.ox + dx, startRef.current.oy + dy))
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const newDist = Math.hypot(dx, dy)
      const newScale = pinchRef.current.scale * (newDist / pinchRef.current.dist)
      onUpdate(clamp(newScale, pinchRef.current.ox, pinchRef.current.oy))
    }
  }, [enabled, scale, onUpdate, clamp])

  const onTouchEnd = useCallback(() => { panningRef.current = false }, [])

  const zoomBy = useCallback((delta) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta))
    const ratio = newScale / scale
    onUpdate(clamp(newScale, offsetX * ratio, offsetY * ratio))
  }, [scale, offsetX, offsetY, onUpdate, clamp])

  // Zoom centered on a specific click point (clientX/Y)
  const zoomAtPoint = useCallback((clientX, clientY, delta) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pointerX = clientX - rect.left - rect.width / 2
    const pointerY = clientY - rect.top - rect.height / 2
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta))
    const ratio = newScale / scale
    const newOX = pointerX - ratio * (pointerX - offsetX)
    const newOY = pointerY - ratio * (pointerY - offsetY)
    onUpdate(clamp(newScale, newOX, newOY))
  }, [containerRef, scale, offsetX, offsetY, onUpdate, clamp])

  return {
    handlers: { onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp, onTouchStart, onTouchMove, onTouchEnd },
    isPanning: panningRef.current,
    computeFit,
    zoomBy,
    zoomAtPoint,
  }
}
