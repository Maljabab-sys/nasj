import { useRef, useState, useCallback, useEffect } from 'react'
import { drawStroke } from './drawAnnotations'
import { generateArchStroke } from './autoArchGenerator'
import { ANNOTATION_COLOR, DASH_PATTERN, LINE_WIDTH } from '../../constants/annotation'

/**
 * Returns canvas-relative normalized (0–1) coords from a pointer event.
 */
export function getNormalizedPoint(e, canvas) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width / (window.devicePixelRatio || 1)
  const scaleY = canvas.height / rect.height / (window.devicePixelRatio || 1)
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  return {
    x: ((clientX - rect.left) * scaleX) / (canvas.width / (window.devicePixelRatio || 1)),
    y: ((clientY - rect.top) * scaleY) / (canvas.height / (window.devicePixelRatio || 1)),
  }
}

export function useAnnotation(imageDataURL) {
  const canvasRef = useRef(null)
  const [activeTool, setActiveTool] = useState('free')
  const [strokes, setStrokes] = useState([])

  // Draw settings ref — updated externally via setDrawSettings
  const drawSettingsRef = useRef({ color: ANNOTATION_COLOR, lineWidth: LINE_WIDTH, dashed: true })

  // In-progress state (refs to avoid stale closures in event handlers)
  const isDrawingRef = useRef(false)
  const currentFreePathRef = useRef([])
  const currentPointsRef = useRef([])
  const previewStrokeRef = useRef(null)
  const hiddenStrokeIdxRef = useRef(-1)

  // Redraw everything on the canvas
  const redraw = useCallback(
    (pendingPoints = null) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const dpr = window.devicePixelRatio || 1
      const W = canvas.width / dpr
      const H = canvas.height / dpr

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw committed strokes (skip hidden stroke during editing)
      strokes.forEach((stroke, i) => {
        if (i === hiddenStrokeIdxRef.current) return
        drawStroke(ctx, stroke, W, H)
      })

      // Draw in-progress free path
      if (isDrawingRef.current && currentFreePathRef.current.length > 1) {
        const ds = drawSettingsRef.current
        drawStroke(
          ctx,
          {
            type: 'free',
            points: currentFreePathRef.current,
            color: ds.color,
            lineWidth: ds.lineWidth,
            dashPattern: ds.dashed ? DASH_PATTERN : [],
          },
          W,
          H,
        )
      }

      // Draw in-progress point-to-point path
      const pts = pendingPoints ?? currentPointsRef.current
      if (pts.length > 1) {
        const ds = drawSettingsRef.current
        drawStroke(
          ctx,
          {
            type: 'points',
            points: pts,
            color: ds.color,
            lineWidth: ds.lineWidth,
            dashPattern: ds.dashed ? DASH_PATTERN : [],
          },
          W,
          H,
        )
      }

      // Draw live preview text stroke
      if (previewStrokeRef.current) {
        drawStroke(ctx, previewStrokeRef.current, W, H)
      }
    },
    [strokes],
  )

  // Resize canvas to match display size with DPR
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      redraw()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [imageDataURL]) // re-init when image changes

  // Redraw whenever strokes change
  useEffect(() => {
    redraw()
  }, [redraw])

  // --- Mouse / Touch handlers ---

  const handleMouseDown = useCallback(
    (e) => {
      if (activeTool !== 'free') return
      e.preventDefault()
      const canvas = canvasRef.current
      isDrawingRef.current = true
      currentFreePathRef.current = [getNormalizedPoint(e, canvas)]
    },
    [activeTool],
  )

  const handleMouseMove = useCallback(
    (e) => {
      if (activeTool !== 'free' || !isDrawingRef.current) return
      e.preventDefault()
      const canvas = canvasRef.current
      currentFreePathRef.current.push(getNormalizedPoint(e, canvas))
      redraw()
    },
    [activeTool, redraw],
  )

  const handleMouseUp = useCallback(
    (e) => {
      if (activeTool !== 'free' || !isDrawingRef.current) return
      e.preventDefault()
      isDrawingRef.current = false
      if (currentFreePathRef.current.length > 1) {
        const ds = drawSettingsRef.current
        const newStroke = {
          type: 'free',
          points: [...currentFreePathRef.current],
          color: ds.color,
          lineWidth: ds.lineWidth,
          dashPattern: ds.dashed ? DASH_PATTERN : [],
        }
        setStrokes((prev) => [...prev, newStroke])
      }
      currentFreePathRef.current = []
    },
    [activeTool],
  )

  const handleClick = useCallback(
    (e) => {
      if (activeTool !== 'points') return
      e.preventDefault()
      const canvas = canvasRef.current
      const pt = getNormalizedPoint(e, canvas)
      currentPointsRef.current = [...currentPointsRef.current, pt]
      redraw()
    },
    [activeTool, redraw],
  )

  const handleDoubleClick = useCallback(
    (e) => {
      if (activeTool !== 'points') return
      e.preventDefault()
      // Remove the last two duplicate points added by the two preceding click events
      const pts = currentPointsRef.current.slice(0, -2)
      if (pts.length > 1) {
        const ds = drawSettingsRef.current
        const newStroke = {
          type: 'points',
          points: pts,
          color: ds.color,
          lineWidth: ds.lineWidth,
          dashPattern: ds.dashed ? DASH_PATTERN : [],
        }
        setStrokes((prev) => [...prev, newStroke])
      }
      currentPointsRef.current = []
    },
    [activeTool],
  )

  const handleMouseLeave = useCallback(
    (e) => {
      if (activeTool === 'free' && isDrawingRef.current) {
        handleMouseUp(e)
      }
    },
    [activeTool, handleMouseUp],
  )

  // Touch aliases
  const handleTouchStart = useCallback((e) => handleMouseDown(e), [handleMouseDown])
  const handleTouchMove = useCallback((e) => handleMouseMove(e), [handleMouseMove])
  const handleTouchEnd = useCallback((e) => handleMouseUp(e), [handleMouseUp])

  // ESC key cancels point-to-point in progress
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        currentPointsRef.current = []
        redraw()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        setStrokes((prev) => prev.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [redraw])

  const setDrawSettings = useCallback((settings) => {
    drawSettingsRef.current = { ...drawSettingsRef.current, ...settings }
  }, [])

  const deleteStroke = useCallback((index) => {
    setStrokes((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const undoLast = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1))
  }, [])

  const clearAll = useCallback(() => {
    setStrokes([])
    currentFreePathRef.current = []
    currentPointsRef.current = []
  }, [])

  const addArchStroke = useCallback((type) => {
    const stroke = generateArchStroke(type)
    setStrokes((prev) => [...prev, stroke])
  }, [])

  const addTextStroke = useCallback(({ text, x, y, fontSize, fontFamily, color, bgColor, textAlign, direction, bgShape }) => {
    setStrokes((prev) => [...prev, { type: 'text', text, x, y, fontSize, fontFamily, color, bgColor, textAlign, direction, bgShape }])
  }, [])

  const setPreviewStroke = useCallback((stroke) => {
    previewStrokeRef.current = stroke
    redraw()
  }, [redraw])

  // Update a stroke at a given index (used for moving text)
  const updateStroke = useCallback((index, patch) => {
    setStrokes((prev) => prev.map((s, i) => i === index ? { ...s, ...patch } : s))
  }, [])

  // Temporarily hide a stroke visually (for editing existing text as preview)
  const hideStroke = useCallback((index) => {
    hiddenStrokeIdxRef.current = index
    redraw()
  }, [redraw])

  const unhideStroke = useCallback(() => {
    hiddenStrokeIdxRef.current = -1
    redraw()
  }, [redraw])

  // Get canvas cursor style
  const getCursor = () => {
    if (activeTool === 'free') return 'crosshair'
    if (activeTool === 'points') return 'cell'
    if (activeTool === 'text') return 'text'
    return 'default'
  }

  return {
    canvasRef,
    activeTool,
    setActiveTool,
    strokes,
    setStrokes,
    drawSettingsRef,
    setDrawSettings,
    deleteStroke,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
      onDoubleClick: handleDoubleClick,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    cursor: getCursor(),
    undoLast,
    clearAll,
    addArchStroke,
    addTextStroke,
    updateStroke,
    setPreviewStroke,
    hideStroke,
    unhideStroke,
  }
}
