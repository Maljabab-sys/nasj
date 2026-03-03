import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useAnnotation } from '../annotation/useAnnotation'
import { getNormalizedPoint } from '../annotation/useAnnotation'
import { usePanZoom } from './usePanZoom'
import InlineToolbar from './InlineToolbar'
import TextStyleToolbar from './TextStyleToolbar'
import TextSelectionBox from './TextSelectionBox'
import {
  TEXT_DEFAULT_SIZE, TEXT_DEFAULT_FONT, TEXT_DEFAULT_COLOR, TEXT_DEFAULT_BG_COLOR,
  TEXT_DEFAULT_ALIGN, TEXT_DEFAULT_DIRECTION, TEXT_DEFAULT_BG_SHAPE,
  TEXT_SIZE_MIN, TEXT_SIZE_MAX, TEXT_SIZE_WHEEL_STEP,
} from '../../constants/annotation'

// Temp canvas for text measurement (reused across calls)
let _measureCanvas = null
function getMeasureCtx() {
  if (!_measureCanvas) _measureCanvas = document.createElement('canvas')
  return _measureCanvas.getContext('2d')
}

/** Hit-test line/free/arch strokes by distance to polyline segments. */
function findLineStrokeAt(strokes, nx, ny, threshold = 0.03) {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]
    if (s.type === 'text') continue
    if (!s.points || s.points.length < 2) continue
    for (let j = 0; j < s.points.length - 1; j++) {
      const a = s.points[j], b = s.points[j + 1]
      const dx = b.x - a.x, dy = b.y - a.y, lenSq = dx * dx + dy * dy
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((nx - a.x) * dx + (ny - a.y) * dy) / lenSq))
      if (Math.hypot(nx - (a.x + t * dx), ny - (a.y + t * dy)) < threshold) return i
    }
  }
  return -1
}

function getLineStrokeBounds(stroke, cw, ch) {
  if (!stroke.points || stroke.points.length < 2) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of stroke.points) {
    const px = p.x * cw, py = p.y * ch
    minX = Math.min(minX, px); minY = Math.min(minY, py)
    maxX = Math.max(maxX, px); maxY = Math.max(maxY, py)
  }
  return { left: minX - 8, top: minY - 8, width: maxX - minX + 16, height: maxY - minY + 16 }
}


/**
 * Hit-test text strokes using actual measured text bounds.
 * cw/ch = container CSS width/height (getBoundingClientRect).
 */
function findTextStrokeAt(strokes, nx, ny, cw, ch) {
  if (!cw || !ch) return -1
  const ctx = getMeasureCtx()
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i]
    if (s.type !== 'text' || s.hidden) continue
    const scaledFont = (s.fontSize || TEXT_DEFAULT_SIZE) * (cw / 1080)
    ctx.font = `bold ${scaledFont}px "${s.fontFamily || TEXT_DEFAULT_FONT}", sans-serif`
    const metrics = ctx.measureText(s.text || ' ')
    const textW = metrics.width / cw
    const padX = (scaledFont * 0.3) / cw
    const padY = (scaledFont * 0.3) / ch
    const align = s.textAlign || 'left'
    let left, right
    if (align === 'center') {
      left = s.x - textW / 2 - padX
      right = s.x + textW / 2 + padX
    } else if (align === 'right') {
      left = s.x - textW - padX
      right = s.x + padX
    } else {
      left = s.x - padX
      right = s.x + textW + padX
    }
    const top = s.y - (scaledFont / 2) / ch - padY
    const bottom = s.y + (scaledFont / 2) / ch + padY
    if (nx >= left && nx <= right && ny >= top && ny <= bottom) {
      return i
    }
  }
  return -1
}

const EditableSlot = forwardRef(function EditableSlot({
  label, color, image, slotState,
  aspectRatio, onSlotStateChange,
  onDrop, onClear, isDragOver, onDragOver, onDragLeave, dragHint,
  onTapPlace, isSelected,
  onActivate, hideToolbar,
  roundedClass = 'rounded-xl',
  selectedTemplate, watermarkText, slotKey,
  drawSettings,
}, ref) {
  const containerRef = useRef(null)
  const prevSize = useRef({ w: 0, h: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })

  // Live refs for values needed inside stale-closure callbacks (e.g. handleMoveMouseDown)
  const liveRef = useRef({ image: null, imgNatural: { w: 0, h: 0 }, scale: 1, offsetX: 0, offsetY: 0 })

  // ── Direct canvas text editing state ──────────────────────────────────
  // editingText = null | { isNew, strokeIdx, originalStroke, text, nx, ny, fontSize, fontFamily, color, bgColor }
  const [editingText, setEditingText] = useState(null)
  const [showCursor, setShowCursor] = useState(true)
  const [textSelected, setTextSelected] = useState(false) // true = all text selected (Ctrl+A / dblclick)
  const editingRef = useRef(null) // mirror of editingText for event handlers

  // Text dragging state (for move mode)
  const draggingRef = useRef({ active: false, strokeIdx: -1, offsetX: 0, offsetY: 0 })
  const [isDraggingText, setIsDraggingText] = useState(false)
  const textClickRef = useRef(null) // null | { startX, startY, hitIdx, offsetX, offsetY }

  // Stroke hover + persistent selection state (for move mode)
  const [hoveredLineIdx, setHoveredLineIdx] = useState(-1)
  const [selectedLineIdx, setSelectedLineIdx] = useState(-1)
  const [hoveredTextIdx, setHoveredTextIdx] = useState(-1)
  const [selectedTextIdx, setSelectedTextIdx] = useState(-1)
  const [showSlotClear, setShowSlotClear] = useState(false)
  const [hoveredOnImage, setHoveredOnImage] = useState(false)

  // Pinch-to-scale ref
  const textPinchRef = useRef({ active: false, startDist: 0, startSize: 0 })

  // Keep editingRef in sync
  useEffect(() => {
    editingRef.current = editingText
  }, [editingText])

  // ── Track container dimensions for accurate crop generation ──────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0 &&
          (Math.abs(width - prevSize.current.w) > 1 || Math.abs(height - prevSize.current.h) > 1)) {
        prevSize.current = { w: width, h: height }
        onSlotStateChange?.({ containerW: width, containerH: height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [image]) // eslint-disable-line

  const mode = slotState?.mode || 'move'
  const scale = slotState?.scale || 1
  const offsetX = slotState?.offsetX || 0
  const offsetY = slotState?.offsetY || 0
  const bgColor = slotState?.bgColor || 'white'

  liveRef.current = { image, imgNatural, scale, offsetX, offsetY }

  const isDrawMode = mode === 'draw' || mode === 'points'
  const isZoomMode = mode === 'zoomIn' || mode === 'zoomOut'
  const isTextMode = mode === 'text'
  const isPanMode = mode === 'move'

  // ── Pan+Zoom ──────────────────────────────────────────────────────────
  const handlePanUpdate = useCallback(({ scale: s, offsetX: ox, offsetY: oy }) => {
    onSlotStateChange?.({ scale: s, offsetX: ox, offsetY: oy })
  }, [onSlotStateChange])

  const { handlers: panHandlers, zoomBy, zoomAtPoint } = usePanZoom({
    containerRef,
    imgNaturalW: imgNatural.w,
    imgNaturalH: imgNatural.h,
    scale, offsetX, offsetY,
    onUpdate: handlePanUpdate,
    enabled: !!image && isPanMode && !isDraggingText,
    wheelEnabled: !!image && isZoomMode,
  })

  // ── Click-to-zoom handler ───────────────────────────────────────────
  const handleZoomClick = useCallback((e) => {
    if (!isZoomMode) return
    const delta = mode === 'zoomIn' ? 0.5 : -0.5
    zoomAtPoint(e.clientX, e.clientY, delta)
  }, [isZoomMode, mode, zoomAtPoint])

  // ── Annotation ────────────────────────────────────────────────────────
  const annotation = useAnnotation(image?.dataURL || '')

  // Expose annotation methods to parent for external toolbar
  useImperativeHandle(ref, () => ({
    addArchStroke: annotation.addArchStroke,
    addTextStroke: annotation.addTextStroke,
    removeTemplateStrokes: annotation.removeTemplateStrokes,
    replaceTemplateStrokes: annotation.replaceTemplateStrokes,
    undoLast: annotation.undoLast,
    deleteStroke: annotation.deleteStroke,
  }), [annotation.addArchStroke, annotation.addTextStroke, annotation.removeTemplateStrokes, annotation.replaceTemplateStrokes, annotation.undoLast, annotation.deleteStroke])

  // Sync draw settings to annotation hook
  useEffect(() => {
    if (drawSettings) annotation.setDrawSettings(drawSettings)
  }, [drawSettings]) // eslint-disable-line

  // Sync strokes from parent → hook on mount / image change
  useEffect(() => {
    if (slotState?.strokes?.length > 0) {
      annotation.setStrokes(slotState.strokes)
    }
  }, [image?.id]) // eslint-disable-line

  // Propagate stroke changes to parent
  const prevStrokesRef = useRef(annotation.strokes)
  useEffect(() => {
    if (annotation.strokes !== prevStrokesRef.current) {
      prevStrokesRef.current = annotation.strokes
      onSlotStateChange?.({ strokes: annotation.strokes })
    }
  }, [annotation.strokes]) // eslint-disable-line

  // Keep annotation tool in sync with mode
  useEffect(() => {
    if (mode === 'draw') annotation.setActiveTool('free')
    else if (mode === 'points') annotation.setActiveTool('points')
    else if (mode === 'text') annotation.setActiveTool('text')
  }, [mode]) // eslint-disable-line

  // Clear selections when mode changes
  useEffect(() => {
    setSelectedLineIdx(-1)
    setSelectedTextIdx(-1)
    setShowSlotClear(false)
    setHoveredLineIdx(-1)
  }, [mode])

  // Clear selections on Escape
  useEffect(() => {
    if (selectedLineIdx < 0 && selectedTextIdx < 0 && !showSlotClear) return
    function handleEscape(e) {
      if (e.key === 'Escape') { setSelectedLineIdx(-1); setSelectedTextIdx(-1); setShowSlotClear(false) }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedLineIdx, selectedTextIdx, showSlotClear])

  // Deselect when clicking outside the canvas container
  useEffect(() => {
    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSelectedLineIdx(-1)
        setSelectedTextIdx(-1)
        setShowSlotClear(false)
      }
    }
    document.addEventListener('pointerdown', handleOutsideClick, true)
    return () => document.removeEventListener('pointerdown', handleOutsideClick, true)
  }, [])

  // Guard stale selection indices after stroke deletion / undo
  useEffect(() => {
    if (selectedLineIdx >= 0 && selectedLineIdx >= annotation.strokes.length) {
      setSelectedLineIdx(-1)
    }
    if (selectedTextIdx >= 0 && selectedTextIdx >= annotation.strokes.length) {
      setSelectedTextIdx(-1)
    }
  }, [annotation.strokes.length, selectedLineIdx, selectedTextIdx])

  function handleModeChange(newMode) {
    onSlotStateChange?.({ mode: newMode })
  }

  function handleBgColorChange(newBg) {
    onSlotStateChange?.({ bgColor: newBg })
  }

  // ── Helper: get normalized coords from a mouse/touch event ──────────
  function getNormFromEvent(e) {
    const canvas = annotation.canvasRef.current
    if (!canvas) return null
    return getNormalizedPoint(e, canvas)
  }

  // ── Helper: container CSS dimensions for hit-testing ────────────────
  function cDims() {
    const r = containerRef.current?.getBoundingClientRect()
    return r ? { w: r.width, h: r.height } : { w: 0, h: 0 }
  }

  // ══════════════════════════════════════════════════════════════════════
  // TEXT EDITING — Snapchat-style direct canvas typing
  // ══════════════════════════════════════════════════════════════════════

  // Cancel editing and clean up when leaving text mode
  useEffect(() => {
    if (!isTextMode && editingText) {
      commitText()
    }
  }, [isTextMode]) // eslint-disable-line

  // ── Blinking cursor (CSS overlay — no canvas text shift) ─────────────
  useEffect(() => {
    if (!editingText) return
    setShowCursor(true)
    const interval = setInterval(() => setShowCursor((v) => !v), 500)
    return () => clearInterval(interval)
  }, [editingText])

  // ── Update preview stroke whenever editing state changes ─────────────
  useEffect(() => {
    if (!editingText) {
      annotation.setPreviewStroke(null)
      return
    }
    // Render actual text only — cursor is a CSS overlay, so no width shift
    const displayText = editingText.text || '\u200B'
    annotation.setPreviewStroke({
      type: 'text',
      text: displayText,
      x: editingText.nx,
      y: editingText.ny,
      fontSize: editingText.fontSize,
      fontFamily: editingText.fontFamily,
      color: editingText.color,
      bgColor: editingText.bgColor,
      textAlign: editingText.textAlign,
      direction: editingText.direction,
      bgShape: editingText.bgShape,
    })
  }, [editingText]) // eslint-disable-line

  // ── Commit current text ──────────────────────────────────────────────
  function commitText() {
    const et = editingRef.current
    if (!et) return
    if (et.text.trim()) {
      const props = {
        text: et.text, fontSize: et.fontSize, fontFamily: et.fontFamily,
        color: et.color, bgColor: et.bgColor,
        textAlign: et.textAlign, direction: et.direction, bgShape: et.bgShape,
      }
      if (et.isNew) {
        annotation.addTextStroke({ ...props, x: et.nx, y: et.ny })
      } else {
        annotation.updateStroke(et.strokeIdx, props)
        annotation.unhideStroke()
      }
    } else {
      if (!et.isNew) annotation.unhideStroke()
    }
    annotation.setPreviewStroke(null)
    setEditingText(null)
    setTextSelected(false)
  }

  // ── Cancel editing ───────────────────────────────────────────────────
  function cancelEdit() {
    const et = editingRef.current
    if (!et) return
    if (!et.isNew) annotation.unhideStroke()
    annotation.setPreviewStroke(null)
    setEditingText(null)
    setTextSelected(false)
  }

  // ── Start new text at position ───────────────────────────────────────
  function startNewText(nx, ny, vx, vy) {
    setHoveredTextIdx(-1)
    setTextSelected(false)
    setEditingText({
      isNew: true, strokeIdx: -1, originalStroke: null,
      text: '', cursorPos: 0, nx, ny, vx, vy,
      fontSize: TEXT_DEFAULT_SIZE, fontFamily: TEXT_DEFAULT_FONT,
      color: TEXT_DEFAULT_COLOR, bgColor: TEXT_DEFAULT_BG_COLOR,
      textAlign: TEXT_DEFAULT_ALIGN, direction: TEXT_DEFAULT_DIRECTION,
      bgShape: TEXT_DEFAULT_BG_SHAPE,
    })
  }

  // ── Edit existing text stroke ────────────────────────────────────────
  function startEditExisting(strokeIdx, vx, vy) {
    setHoveredTextIdx(-1)
    setTextSelected(false)
    const stroke = annotation.strokes[strokeIdx]
    annotation.hideStroke(strokeIdx)
    setEditingText({
      isNew: false, strokeIdx, originalStroke: { ...stroke },
      text: stroke.text, cursorPos: stroke.text.length, nx: stroke.x, ny: stroke.y, vx, vy,
      fontSize: stroke.fontSize || TEXT_DEFAULT_SIZE,
      fontFamily: stroke.fontFamily || TEXT_DEFAULT_FONT,
      color: stroke.color || TEXT_DEFAULT_COLOR,
      bgColor: stroke.bgColor || TEXT_DEFAULT_BG_COLOR,
      textAlign: stroke.textAlign || TEXT_DEFAULT_ALIGN,
      direction: stroke.direction || TEXT_DEFAULT_DIRECTION,
      bgShape: stroke.bgShape || TEXT_DEFAULT_BG_SHAPE,
    })
  }

  // ── Keyboard handler for direct typing ───────────────────────────────
  useEffect(() => {
    if (!editingText) return
    function handleKey(e) {
      const et = editingRef.current
      if (!et) return
      const pos = et.cursorPos ?? et.text.length

      if (e.key === 'Escape') {
        e.preventDefault()
        cancelEdit()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        commitText()
        return
      }
      // Ctrl+A / Cmd+A — select all text
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        if (et.text.length > 0) setTextSelected(true)
        return
      }
      // Arrow keys — move cursor position
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (textSelected) { setTextSelected(false); setEditingText((p) => p ? { ...p, cursorPos: 0 } : null) }
        else setEditingText((p) => p ? { ...p, cursorPos: Math.max(0, (p.cursorPos ?? p.text.length) - 1) } : null)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (textSelected) { setTextSelected(false); setEditingText((p) => p ? { ...p, cursorPos: p.text.length } : null) }
        else setEditingText((p) => p ? { ...p, cursorPos: Math.min(p.text.length, (p.cursorPos ?? p.text.length) + 1) } : null)
        return
      }
      // Home / End
      if (e.key === 'Home') {
        e.preventDefault()
        setTextSelected(false)
        setEditingText((p) => p ? { ...p, cursorPos: 0 } : null)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        setTextSelected(false)
        setEditingText((p) => p ? { ...p, cursorPos: p.text.length } : null)
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        setEditingText((prev) => {
          if (!prev) return null
          if (textSelected) {
            setTextSelected(false)
            return { ...prev, text: '', cursorPos: 0 }
          }
          const cp = prev.cursorPos ?? prev.text.length
          if (cp <= 0) return prev
          return { ...prev, text: prev.text.slice(0, cp - 1) + prev.text.slice(cp), cursorPos: cp - 1 }
        })
        return
      }
      if (e.key === 'Delete') {
        e.preventDefault()
        setEditingText((prev) => {
          if (!prev) return null
          if (textSelected) {
            setTextSelected(false)
            return { ...prev, text: '', cursorPos: 0 }
          }
          const cp = prev.cursorPos ?? prev.text.length
          if (cp >= prev.text.length) return prev
          return { ...prev, text: prev.text.slice(0, cp) + prev.text.slice(cp + 1), cursorPos: cp }
        })
        return
      }
      // Ignore other modifier combos, function keys, etc.
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key.length !== 1) return

      e.preventDefault()
      setEditingText((prev) => {
        if (!prev) return null
        if (textSelected) {
          setTextSelected(false)
          return { ...prev, text: e.key, cursorPos: 1 }
        }
        const cp = prev.cursorPos ?? prev.text.length
        return { ...prev, text: prev.text.slice(0, cp) + e.key + prev.text.slice(cp), cursorPos: cp + 1 }
      })
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [editingText, textSelected]) // eslint-disable-line

  // ── Click-away to commit ─────────────────────────────────────────────
  useEffect(() => {
    if (!editingText) return
    function handleClickAway(e) {
      // Don't commit if clicking on the style toolbar or scale handle
      const target = e.target
      if (target.closest?.('[data-text-toolbar]') || target.closest?.('[data-scale-handle]')) return
      // Don't commit if clicking inside the container in text mode (handled by text click handler)
      if (containerRef.current?.contains(target) && isTextMode) return
      commitText()
    }
    // Use timeout to avoid the initial click that opened editing from triggering this
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickAway)
    }, 100)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClickAway)
    }
  }, [editingText, isTextMode]) // eslint-disable-line

  // ── Text mode mousedown — record potential click/drag ────────────────
  const dblClickGuardRef = useRef(null) // timer ID to distinguish single vs double click
  const handleTextMouseDown = useCallback((e) => {
    if (!isTextMode) return
    const et = editingRef.current
    if (et) {
      // Currently editing — defer select-all toggle to allow dblclick to override
      // Clear any pending single-click action (a dblclick is coming)
      if (dblClickGuardRef.current) clearTimeout(dblClickGuardRef.current)
      dblClickGuardRef.current = setTimeout(() => {
        // Single click: if text is selected, deselect; otherwise select all
        if (et.text.length > 0) setTextSelected((prev) => !prev)
        dblClickGuardRef.current = null
      }, 250) // dblclick fires within ~250ms
      return
    }

    const norm = getNormFromEvent(e)
    if (!norm) return

    const d = cDims()
    const hitIdx = findTextStrokeAt(annotation.strokes, norm.x, norm.y, d.w, d.h)
    if (hitIdx >= 0) {
      e.preventDefault()
      e.stopPropagation()
      const stroke = annotation.strokes[hitIdx]
      // Record for click-vs-drag detection — DON'T activate drag yet
      textClickRef.current = {
        startX: e.clientX, startY: e.clientY,
        hitIdx,
        offsetX: norm.x - stroke.x,
        offsetY: norm.y - stroke.y,
      }
    } else {
      textClickRef.current = null
    }
  }, [isTextMode, annotation.strokes]) // eslint-disable-line

  // ── Text mode mousemove — activate drag after threshold ────────────
  const handleTextMouseMove = useCallback((e) => {
    // If actively dragging, continue drag
    if (draggingRef.current.active) {
      e.preventDefault()
      const norm = getNormFromEvent(e)
      if (!norm) return
      const newX = Math.max(0, Math.min(1, norm.x - draggingRef.current.offsetX))
      const newY = Math.max(0, Math.min(1, norm.y - draggingRef.current.offsetY))
      annotation.updateStroke(draggingRef.current.strokeIdx, { x: newX, y: newY })
      return
    }

    // If there's a pending text click, check if should start dragging
    const click = textClickRef.current
    if (!click) {
      // Hover tracking — update hovered text index
      if (!editingRef.current) {
        const norm = getNormFromEvent(e)
        if (norm) {
          const d = cDims()
          const hitIdx = findTextStrokeAt(annotation.strokes, norm.x, norm.y, d.w, d.h)
          setHoveredTextIdx(hitIdx)
        }
      }
      return
    }
    const dx = e.clientX - click.startX
    const dy = e.clientY - click.startY
    if (Math.hypot(dx, dy) > 5) {
      draggingRef.current = {
        active: true, strokeIdx: click.hitIdx,
        offsetX: click.offsetX, offsetY: click.offsetY,
      }
      setIsDraggingText(true)
      textClickRef.current = null // consumed — now a drag
    }
  }, [annotation.strokes]) // eslint-disable-line

  // ── Text mode mouseup — click-to-edit or end drag ─────────────────
  const handleTextMouseUp = useCallback((e) => {
    if (!isTextMode) return

    // End any active drag
    if (draggingRef.current.active) {
      draggingRef.current = { active: false, strokeIdx: -1, offsetX: 0, offsetY: 0 }
      setIsDraggingText(false)
      textClickRef.current = null
      return // was a drag, not a click
    }

    // Was a click on text (mousedown on text, no significant movement) → edit
    const pendingClick = textClickRef.current
    textClickRef.current = null
    if (pendingClick) {
      startEditExisting(pendingClick.hitIdx, e.clientX, e.clientY)
      return
    }

    // Normal mouseup — no text was hit on mousedown
    const norm = getNormFromEvent(e)
    if (!norm) return

    const d = cDims()
    const et = editingRef.current
    if (et) {
      // Already editing — commit current and check what was clicked
      const hitIdx = findTextStrokeAt(annotation.strokes, norm.x, norm.y, d.w, d.h)
      commitText()
      if (hitIdx >= 0) {
        setTimeout(() => startEditExisting(hitIdx, e.clientX, e.clientY), 0)
      }
      return
    }

    // Not editing — check if clicked on existing text
    const hitIdx = findTextStrokeAt(annotation.strokes, norm.x, norm.y, d.w, d.h)
    if (hitIdx >= 0) {
      startEditExisting(hitIdx, e.clientX, e.clientY)
    } else {
      startNewText(norm.x, norm.y, e.clientX, e.clientY)
    }
  }, [isTextMode, annotation.strokes]) // eslint-disable-line

  // ── Move mode: drag text/line strokes + click-to-select with delete ──
  const handleMoveMouseDown = useCallback((e) => {
    const norm = getNormFromEvent(e)
    if (!norm) return
    const d = cDims()
    // Check text strokes first (drag or click-to-select)
    const hitIdx = findTextStrokeAt(annotation.strokes, norm.x, norm.y, d.w, d.h)
    if (hitIdx >= 0) {
      e.preventDefault()
      e.stopPropagation()
      const stroke = annotation.strokes[hitIdx]
      draggingRef.current = {
        active: true, strokeIdx: hitIdx, type: 'text',
        offsetX: norm.x - stroke.x, offsetY: norm.y - stroke.y,
        startX: norm.x, startY: norm.y, hasMoved: false,
      }
      setIsDraggingText(true)
      setSelectedLineIdx(-1)
      setShowSlotClear(false)
      return
    }
    // Check line strokes (drag or click-to-select)
    const lineHitIdx = findLineStrokeAt(annotation.strokes, norm.x, norm.y)
    if (lineHitIdx >= 0) {
      e.preventDefault()
      e.stopPropagation()
      const stroke = annotation.strokes[lineHitIdx]
      draggingRef.current = {
        active: true, strokeIdx: lineHitIdx, type: 'line',
        startX: norm.x, startY: norm.y,
        originalPoints: stroke.points.map(p => ({ ...p })),
        hasMoved: false,
      }
      setIsDraggingText(true)
      setSelectedTextIdx(-1)
      setShowSlotClear(false)
      return
    }
    // Clicked empty area — show image controls only if click landed on the visual image
    // Use liveRef to avoid stale-closure issues (this callback depends only on annotation.strokes)
    const live = liveRef.current
    let isOnImage = false
    if (live.image && live.imgNatural.w && live.imgNatural.h) {
      const cW = d.w, cH = d.h
      const imgRatio = live.imgNatural.w / live.imgNatural.h
      const cRatio = cW / cH
      const fitW = imgRatio > cRatio ? cW : cH * imgRatio
      const fitH = imgRatio > cRatio ? cW / imgRatio : cH
      const imgLeft = cW / 2 + live.offsetX - (fitW * live.scale) / 2
      const imgTop = cH / 2 + live.offsetY - (fitH * live.scale) / 2
      const clickPxX = norm.x * cW
      const clickPxY = norm.y * cH
      isOnImage = clickPxX >= imgLeft && clickPxX <= imgLeft + fitW * live.scale &&
                  clickPxY >= imgTop && clickPxY <= imgTop + fitH * live.scale
    }
    setSelectedLineIdx(-1)
    setSelectedTextIdx(-1)
    setShowSlotClear(isOnImage)
  }, [annotation.strokes]) // eslint-disable-line

  const handleMoveMouseMove = useCallback((e) => {
    if (!draggingRef.current.active) return
    e.preventDefault()
    const norm = getNormFromEvent(e)
    if (!norm) return
    if (draggingRef.current.type === 'line') {
      const dx = norm.x - draggingRef.current.startX
      const dy = norm.y - draggingRef.current.startY
      if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
        draggingRef.current.hasMoved = true
      }
      const newPoints = draggingRef.current.originalPoints.map(p => ({
        x: p.x + dx, y: p.y + dy,
      }))
      annotation.updateStroke(draggingRef.current.strokeIdx, { points: newPoints })
    } else {
      // Text drag
      const dx = norm.x - draggingRef.current.startX
      const dy = norm.y - draggingRef.current.startY
      if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
        draggingRef.current.hasMoved = true
      }
      const newX = Math.max(0, Math.min(1, norm.x - draggingRef.current.offsetX))
      const newY = Math.max(0, Math.min(1, norm.y - draggingRef.current.offsetY))
      annotation.updateStroke(draggingRef.current.strokeIdx, { x: newX, y: newY })
    }
  }, []) // eslint-disable-line

  const handleMoveMouseUp = useCallback(() => {
    if (draggingRef.current.active) {
      // Click (no drag) → select it
      if (!draggingRef.current.hasMoved) {
        if (draggingRef.current.type === 'line') {
          setSelectedLineIdx(draggingRef.current.strokeIdx)
          setSelectedTextIdx(-1)
        } else if (draggingRef.current.type === 'text') {
          setSelectedTextIdx(draggingRef.current.strokeIdx)
          setSelectedLineIdx(-1)
        }
      }
      draggingRef.current = { active: false, strokeIdx: -1, offsetX: 0, offsetY: 0 }
      setIsDraggingText(false)
    }
  }, [])

  // ── Wheel-to-scale text (Desktop) ─────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || !editingText) return
    function handleTextWheel(e) {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? -TEXT_SIZE_WHEEL_STEP : TEXT_SIZE_WHEEL_STEP
      setEditingText((prev) => {
        if (!prev) return null
        const newSize = Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, prev.fontSize + delta))
        return { ...prev, fontSize: newSize }
      })
    }
    el.addEventListener('wheel', handleTextWheel, { passive: false, capture: true })
    return () => el.removeEventListener('wheel', handleTextWheel, { capture: true })
  }, [editingText])

  // ── Pinch-to-scale text (Mobile) ────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el || !editingText) return
    function getTouchDist(e) {
      if (e.touches.length < 2) return 0
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      return Math.hypot(dx, dy)
    }
    function handleTouchStart(e) {
      if (e.touches.length === 2) {
        e.preventDefault()
        e.stopPropagation()
        textPinchRef.current = { active: true, startDist: getTouchDist(e), startSize: editingRef.current?.fontSize || TEXT_DEFAULT_SIZE }
      }
    }
    function handleTouchMove(e) {
      if (!textPinchRef.current.active || e.touches.length < 2) return
      e.preventDefault()
      e.stopPropagation()
      const newDist = getTouchDist(e)
      const ratio = newDist / textPinchRef.current.startDist
      const newSize = Math.round(textPinchRef.current.startSize * ratio)
      setEditingText((prev) => {
        if (!prev) return null
        return { ...prev, fontSize: Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, newSize)) }
      })
    }
    function handleTouchEnd(e) {
      if (e.touches.length < 2) textPinchRef.current.active = false
    }
    el.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
    el.addEventListener('touchend', handleTouchEnd, { capture: true })
    return () => {
      el.removeEventListener('touchstart', handleTouchStart, { capture: true })
      el.removeEventListener('touchmove', handleTouchMove, { capture: true })
      el.removeEventListener('touchend', handleTouchEnd, { capture: true })
    }
  }, [editingText])

  // ── Style change handlers (from toolbar) ─────────────────────────────
  function handleFontChange(font) {
    setEditingText((prev) => prev ? { ...prev, fontFamily: font } : null)
  }
  function handleTextColorChange(c) {
    setEditingText((prev) => prev ? { ...prev, color: c } : null)
  }
  function handleTextBgColorChange(c) {
    setEditingText((prev) => prev ? { ...prev, bgColor: c } : null)
  }
  function handleScaleHandleSizeChange(newSize) {
    setEditingText((prev) => prev ? { ...prev, fontSize: newSize } : null)
  }
  function handleTextAlignChange(align) {
    setEditingText((prev) => prev ? { ...prev, textAlign: align } : null)
  }
  function handleDirectionChange(dir) {
    setEditingText((prev) => prev ? { ...prev, direction: dir } : null)
  }
  function handleBgShapeChange(shape) {
    setEditingText((prev) => prev ? { ...prev, bgShape: shape } : null)
  }

  // ── Compute text bounding box for selection box ──────────────────────
  function getTextBounds() {
    if (!editingText || !containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const W = rect.width
    const H = rect.height
    const px = editingText.nx * W
    const py = editingText.ny * H
    const scaledFont = editingText.fontSize * (W / 1080)

    const ctx = getMeasureCtx()
    ctx.font = `bold ${scaledFont}px "${editingText.fontFamily}", sans-serif`
    const text = editingText.text || ' '
    const metrics = ctx.measureText(text)

    const padX = scaledFont * 0.25
    const padY = scaledFont * 0.15
    const margin = 6
    const textW = metrics.width
    const align = editingText.textAlign || 'left'
    let leftPx
    if (align === 'center') leftPx = px - textW / 2 - padX - margin
    else if (align === 'right') leftPx = px - textW - padX - margin
    else leftPx = px - padX - margin
    return {
      left: leftPx,
      top: py - scaledFont / 2 - padY - margin,
      width: Math.max(textW + padX * 2 + margin * 2, 40),
      height: scaledFont + padY * 2 + margin * 2,
    }
  }

  // ── Compute text bounding box for any committed stroke (hover highlight) ──
  function getStrokeTextBounds(stroke) {
    if (!stroke || stroke.type !== 'text' || !containerRef.current) return null
    const rect = containerRef.current.getBoundingClientRect()
    const W = rect.width, H = rect.height
    const px = stroke.x * W, py = stroke.y * H
    const scaledFont = (stroke.fontSize || TEXT_DEFAULT_SIZE) * (W / 1080)
    const ctx = getMeasureCtx()
    ctx.font = `bold ${scaledFont}px "${stroke.fontFamily || TEXT_DEFAULT_FONT}", sans-serif`
    const metrics = ctx.measureText(stroke.text || ' ')
    const textW = metrics.width
    const padX = scaledFont * 0.25, padY = scaledFont * 0.15, margin = 4
    const align = stroke.textAlign || 'left'
    let leftPx
    if (align === 'center') leftPx = px - textW / 2 - padX - margin
    else if (align === 'right') leftPx = px - textW - padX - margin
    else leftPx = px - padX - margin
    return {
      left: leftPx,
      top: py - scaledFont / 2 - padY - margin,
      width: Math.max(textW + padX * 2 + margin * 2, 40),
      height: scaledFont + padY * 2 + margin * 2,
    }
  }

  function handleImgLoad(e) {
    setImgNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })
  }

  // ── Compute CSS transform for pan+zoom ────────────────────────────────
  const imgStyle = {
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
    transformOrigin: 'center center',
  }

  // ── Compute the image's visual rect inside the container ─────────────
  function getImageRect() {
    const el = containerRef.current
    if (!el || !imgNatural.w || !imgNatural.h) return null
    const rect = el.getBoundingClientRect()
    const cW = rect.width, cH = rect.height
    const imgRatio = imgNatural.w / imgNatural.h
    const containerRatio = cW / cH
    let fitW, fitH
    if (imgRatio > containerRatio) { fitW = cW; fitH = cW / imgRatio }
    else { fitH = cH; fitW = cH * imgRatio }
    const imgLeft = cW / 2 + offsetX - (fitW * scale) / 2
    const imgTop = cH / 2 + offsetY - (fitH * scale) / 2
    const imgRight = imgLeft + fitW * scale
    const imgBottom = imgTop + fitH * scale
    return { left: imgLeft, top: imgTop, right: imgRight, bottom: imgBottom }
  }

  // ── Background style for slot ─────────────────────────────────────────
  const bgStyle = {}
  if (bgColor === 'white') {
    bgStyle.backgroundColor = '#ffffff'
  } else if (bgColor === 'transparent') {
    bgStyle.backgroundImage = 'repeating-conic-gradient(#d1d5db 0% 25%, transparent 0% 50%)'
    bgStyle.backgroundSize = '16px 16px'
  } else {
    bgStyle.backgroundColor = '#0a0a0a'
  }

  const sizeStyle = {
    aspectRatio: aspectRatio === 'auto' ? undefined : (aspectRatio || '1/1'),
    minHeight: aspectRatio === 'auto' ? 0 : 80,
    flex: aspectRatio === 'auto' ? '1 1 0%' : undefined,
    overflow: aspectRatio === 'auto' ? 'hidden' : undefined,
  }

  const dragDropHandlers = {
    onDragOver: (e) => { e.preventDefault(); onDragOver?.() },
    onDragLeave,
    onDrop: (e) => { e.preventDefault(); onDrop?.(e.dataTransfer.getData('imageId')) },
  }

  // ── Cursor for current mode ───────────────────────────────────────────
  function getCursor() {
    if (isDraggingText) return 'grabbing'
    if (isDrawMode) return annotation.cursor
    if (mode === 'zoomIn') return 'zoom-in'
    if (mode === 'zoomOut') return 'zoom-out'
    if (isTextMode) return hoveredTextIdx >= 0 ? 'pointer' : 'text'
    if (isPanMode) return (hoveredTextIdx >= 0 || hoveredLineIdx >= 0 || hoveredOnImage) ? 'pointer' : 'default'
    return 'default'
  }

  // ── Slot render (works with or without image) ──────────────────────────
  const borderColor = isDragOver
    ? 'border-blue-400'
    : 'border-transparent'

  // Build container interaction handlers based on mode
  let containerInteractionHandlers = {}
  if (isTextMode) {
    containerInteractionHandlers = {
      onMouseDown: handleTextMouseDown,
      onMouseMove: handleTextMouseMove,
      onMouseUp: handleTextMouseUp,
      onDoubleClick: (e) => {
        // Cancel the pending single-click toggle from mousedown
        if (dblClickGuardRef.current) {
          clearTimeout(dblClickGuardRef.current)
          dblClickGuardRef.current = null
        }
        // Double-click while editing → select all text
        if (editingRef.current && editingRef.current.text.length > 0) {
          e.preventDefault()
          e.stopPropagation()
          setTextSelected(true)
        }
      },
      onMouseLeave: () => { handleMoveMouseUp(); setHoveredTextIdx(-1) },
    }
  } else if (isPanMode) {
    containerInteractionHandlers = {
      ...panHandlers,
      onMouseDown: (e) => {
        handleMoveMouseDown(e)
        if (!draggingRef.current.active) {
          // Only allow panning if click landed on the actual visible image
          const norm = getNormFromEvent(e)
          const d = cDims()
          const live = liveRef.current
          let isOnImage = false
          if (norm && live.image && live.imgNatural.w && live.imgNatural.h) {
            const cW = d.w, cH = d.h
            const imgRatio = live.imgNatural.w / live.imgNatural.h
            const cRatio = cW / cH
            const fitW = imgRatio > cRatio ? cW : cH * imgRatio
            const fitH = imgRatio > cRatio ? cW / imgRatio : cH
            const imgLeft = cW / 2 + live.offsetX - (fitW * live.scale) / 2
            const imgTop = cH / 2 + live.offsetY - (fitH * live.scale) / 2
            isOnImage = norm.x * cW >= imgLeft && norm.x * cW <= imgLeft + fitW * live.scale &&
                        norm.y * cH >= imgTop && norm.y * cH <= imgTop + fitH * live.scale
          }
          if (isOnImage) {
            panHandlers.onMouseDown(e)
            // Track pan start position to detect drag vs click
            containerRef.current._panStart = { x: e.clientX, y: e.clientY }
          }
        }
      },
      onMouseMove: (e) => {
        if (draggingRef.current.active) {
          handleMoveMouseMove(e)
        } else {
          // If panning (dragging on empty area), hide slot clear button
          const ps = containerRef.current?._panStart
          if (ps && Math.hypot(e.clientX - ps.x, e.clientY - ps.y) > 5) {
            setShowSlotClear(false)
            containerRef.current._panStart = null
          }
          const norm = getNormFromEvent(e)
          if (norm) {
            const d = cDims()
            setHoveredTextIdx(findTextStrokeAt(annotation.strokes, norm.x, norm.y, d.w, d.h))
            setHoveredLineIdx(findLineStrokeAt(annotation.strokes, norm.x, norm.y))
            // Track whether mouse is over the actual visible image
            const live = liveRef.current
            let onImg = false
            if (live.image && live.imgNatural.w && live.imgNatural.h) {
              const cW = d.w, cH = d.h
              const imgRatio = live.imgNatural.w / live.imgNatural.h
              const cRatio = cW / cH
              const fitW = imgRatio > cRatio ? cW : cH * imgRatio
              const fitH = imgRatio > cRatio ? cW / imgRatio : cH
              const imgLeft = cW / 2 + live.offsetX - (fitW * live.scale) / 2
              const imgTop = cH / 2 + live.offsetY - (fitH * live.scale) / 2
              onImg = norm.x * cW >= imgLeft && norm.x * cW <= imgLeft + fitW * live.scale &&
                      norm.y * cH >= imgTop && norm.y * cH <= imgTop + fitH * live.scale
            }
            setHoveredOnImage(onImg)
          }
          panHandlers.onMouseMove(e)
        }
      },
      onMouseUp: (e) => {
        handleMoveMouseUp()
        containerRef.current._panStart = null
        panHandlers.onMouseUp(e)
      },
      onMouseLeave: (e) => {
        handleMoveMouseUp()
        containerRef.current._panStart = null
        setHoveredTextIdx(-1)
        setHoveredLineIdx(-1)
        setHoveredOnImage(false)
        panHandlers.onMouseLeave(e)
      },
    }
  } else if (isZoomMode) {
    containerInteractionHandlers = { onClick: handleZoomClick }
  }

  const textBounds = getTextBounds()
  const hoveredTextBounds = ((isTextMode || isPanMode) && !editingText && hoveredTextIdx >= 0)
    ? getStrokeTextBounds(annotation.strokes[hoveredTextIdx])
    : null

  return (
    <div className="flex flex-row" style={sizeStyle}>
      {/* Image container */}
      <div
        ref={containerRef}
        className={`relative flex-1 ${roundedClass} border-2 ${!image ? 'border-dashed' : ''} ${!image && !isDragOver ? (isSelected ? 'border-blue-400' : 'border-stone-300 dark:border-[#3a3a3a]') : borderColor} overflow-hidden select-none transition-all`}
        style={{
          touchAction: 'none',
          cursor: getCursor(),
          ...bgStyle,
        }}
        onPointerDown={() => onActivate?.()}
        {...dragDropHandlers}
        {...containerInteractionHandlers}
      >
        {image ? (
          <img
            src={image.dataURL}
            alt={label}
            onLoad={handleImgLoad}
            draggable={false}
            className="w-full h-full object-contain"
            style={imgStyle}
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center z-0"
            style={{ pointerEvents: (isTextMode || isDrawMode) ? 'none' : 'auto' }}
            onClick={onTapPlace}
          >
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center
              ${color === 'orange' ? 'border-orange-600 text-orange-500' : 'border-green-600 text-green-500'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${color === 'orange' ? 'text-orange-500' : 'text-green-500'}`}>{label}</span>
            <span className="text-gray-400 dark:text-gray-600 text-xs">{dragHint}</span>
          </div>
        )}

        <canvas
          ref={annotation.canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            pointerEvents: isDrawMode ? 'auto' : 'none',
            cursor: isDrawMode ? annotation.cursor : undefined,
            touchAction: 'none',
          }}
          {...(isDrawMode ? annotation.handlers : {})}
        />

        {/* Canva-style selection box while editing text */}
        {editingText && textBounds && (
          <>
            <TextSelectionBox
              bounds={textBounds}
              fontSize={editingText.fontSize}
              onSizeChange={handleScaleHandleSizeChange}
            />
            {/* CSS blinking cursor + selection highlight overlay */}
            {(() => {
              const rect = containerRef.current?.getBoundingClientRect()
              if (!rect) return null
              const W = rect.width
              const scaledFont = editingText.fontSize * (W / 1080)
              const ctx = getMeasureCtx()
              ctx.font = `bold ${scaledFont}px "${editingText.fontFamily}", sans-serif`
              const fullTextW = ctx.measureText(editingText.text || '').width
              const cp = editingText.cursorPos ?? editingText.text.length
              const cursorPosW = ctx.measureText((editingText.text || '').slice(0, cp)).width
              const py = editingText.ny * rect.height
              const px = editingText.nx * W
              const align = editingText.textAlign || 'left'
              let textLeftX
              if (align === 'center') textLeftX = px - fullTextW / 2
              else if (align === 'right') textLeftX = px - fullTextW
              else textLeftX = px
              const cursorX = textLeftX + cursorPosW
              return (
                <>
                  {/* Selection highlight */}
                  {textSelected && editingText.text.length > 0 && (
                    <div
                      className="absolute pointer-events-none z-[2] rounded-sm"
                      style={{
                        left: textLeftX,
                        top: py - scaledFont / 2,
                        width: fullTextW || 4,
                        height: scaledFont,
                        backgroundColor: 'rgba(59, 130, 246, 0.35)',
                      }}
                    />
                  )}
                  {/* Blinking cursor */}
                  {!textSelected && (
                    <div
                      className="absolute pointer-events-none z-[3]"
                      style={{
                        left: cursorX,
                        top: py - scaledFont / 2,
                        width: 2,
                        height: scaledFont,
                        backgroundColor: editingText.color || TEXT_DEFAULT_COLOR,
                        opacity: showCursor ? 1 : 0,
                        transition: 'opacity 0.1s',
                      }}
                    />
                  )}
                </>
              )
            })()}
          </>
        )}

        {/* Hover highlight for text strokes */}
        {(isTextMode || isPanMode) && !editingText && hoveredTextBounds && (
          <div
            className="absolute pointer-events-none border-2 border-blue-400/70 rounded z-[2]"
            style={{
              left: hoveredTextBounds.left,
              top: hoveredTextBounds.top,
              width: hoveredTextBounds.width,
              height: hoveredTextBounds.height,
            }}
          />
        )}

        {/* Hover highlight for image */}
        {isPanMode && hoveredOnImage && hoveredTextIdx < 0 && hoveredLineIdx < 0 && !showSlotClear && (() => {
          const ir = getImageRect()
          if (!ir) return null
          const el = containerRef.current
          const cRect = el ? el.getBoundingClientRect() : { width: 0, height: 0 }
          const cW = cRect.width, cH = cRect.height
          const boxL = Math.max(0, ir.left), boxT = Math.max(0, ir.top)
          const boxR = Math.min(cW, ir.right), boxB = Math.min(cH, ir.bottom)
          return (
            <div
              className="absolute pointer-events-none border-2 border-blue-400/70 rounded z-[2]"
              style={{ left: boxL, top: boxT, width: boxR - boxL, height: boxB - boxT }}
            />
          )
        })()}

        {/* Selected line stroke — persistent highlight + delete button */}
        {isPanMode && !editingText && selectedLineIdx >= 0 && annotation.strokes[selectedLineIdx] && (() => {
          const d = cDims()
          const bounds = getLineStrokeBounds(annotation.strokes[selectedLineIdx], d.w, d.h)
          if (!bounds) return null
          return (
            <>
              <div
                className="absolute pointer-events-none border-2 border-blue-400/70 rounded z-[2]"
                style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }}
              />
              <button
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  annotation.deleteStroke(selectedLineIdx)
                  setSelectedLineIdx(-1)
                }}
                className="absolute w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full text-white text-xs flex items-center justify-center z-[3] shadow-md transition-colors"
                style={{ left: bounds.left + bounds.width - 4, top: bounds.top - 6 }}
              >×</button>
            </>
          )
        })()}

        {/* Selected text stroke — persistent highlight + delete button */}
        {isPanMode && !editingText && selectedTextIdx >= 0 && annotation.strokes[selectedTextIdx] && (() => {
          const bounds = getStrokeTextBounds(annotation.strokes[selectedTextIdx])
          if (!bounds) return null
          return (
            <>
              <div
                className="absolute pointer-events-none border-2 border-blue-400/70 rounded z-[2]"
                style={{ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }}
              />
              <button
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  annotation.deleteStroke(selectedTextIdx)
                  setSelectedTextIdx(-1)
                }}
                className="absolute w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full text-white text-xs flex items-center justify-center z-[3] shadow-md transition-colors"
                style={{ left: bounds.left + bounds.width - 4, top: bounds.top - 6 }}
              >×</button>
            </>
          )
        })()}

        {/* Template labels are now editable text strokes — no static CSS overlay needed */}

        {/* Image controls — shown on click: selection box with scale handles + × */}
        {image && showSlotClear && (() => {
          const ir = getImageRect()
          if (!ir) return null
          const el = containerRef.current
          const cRect = el ? el.getBoundingClientRect() : { width: 0, height: 0 }
          const cW = cRect.width, cH = cRect.height
          // Clamp image rect to container for visual bounds
          const boxL = Math.max(0, ir.left), boxT = Math.max(0, ir.top)
          const boxR = Math.min(cW, ir.right), boxB = Math.min(cH, ir.bottom)
          const boxW = boxR - boxL, boxH = boxB - boxT
          // × button at image top-right
          const btnSize = 24, margin = 4
          const btnLeft = Math.min(Math.max(ir.right, btnSize + margin), cW) - btnSize - margin
          const btnTop = Math.max(ir.top + margin, margin)

          function handleScaleStart(e) {
            e.preventDefault()
            e.stopPropagation()
            const clientY = e.touches ? e.touches[0].clientY : e.clientY
            const startScale = scale
            // Compute scale factor so image edge tracks the mouse 1:1
            // Image grows from center, so bottom edge moves by fitH * deltaScale / 2
            // For it to match deltaY: scaleFactor = 2 * startScale / visibleH
            const visibleH = ir.bottom - ir.top
            const scaleFactor = visibleH > 0 ? (2 * startScale) / visibleH : 0.005
            // Lock cursor globally with !important to override inline styles
            const cursorLock = document.createElement('style')
            cursorLock.textContent = '* { cursor: ns-resize !important; }'
            document.head.appendChild(cursorLock)
            function handleMove(ev) {
              ev.preventDefault()
              const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
              const deltaY = cy - clientY
              const newScale = Math.max(0.3, Math.min(5, startScale + deltaY * scaleFactor))
              onSlotStateChange?.({ scale: newScale })
            }
            function handleEnd() {
              cursorLock.remove()
              document.removeEventListener('mousemove', handleMove)
              document.removeEventListener('mouseup', handleEnd)
              document.removeEventListener('touchmove', handleMove)
              document.removeEventListener('touchend', handleEnd)
            }
            document.addEventListener('mousemove', handleMove)
            document.addEventListener('mouseup', handleEnd)
            document.addEventListener('touchmove', handleMove, { passive: false })
            document.addEventListener('touchend', handleEnd)
          }

          return (
            <>
              {/* Dashed selection border around visible image */}
              <div
                className="absolute pointer-events-none z-10"
                style={{ left: boxL, top: boxT, width: boxW, height: boxH }}
              >
                <div className="w-full h-full border-[1.5px] border-dashed border-blue-400 rounded-sm" />
                {/* Corner handles */}
                {[[0,0,'nw'],[0,1,'sw'],[1,0,'ne'],[1,1,'se']].map(([cx,cy,dir]) => (
                  <div
                    key={dir}
                    className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto"
                    style={{
                      ...(cx ? { right: 0 } : { left: 0 }),
                      ...(cy ? { bottom: 0, top: 'auto' } : { top: 0 }),
                      transform: `translate(${cx ? '50%' : '-50%'}, ${cy ? '50%' : '-50%'})`,
                      cursor: `${dir}-resize`,
                    }}
                    onMouseDown={handleScaleStart}
                    onTouchStart={handleScaleStart}
                  />
                ))}
                {/* Bottom-center resize pill */}
                <div
                  className="absolute pointer-events-auto cursor-ns-resize"
                  style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' }}
                  onMouseDown={handleScaleStart}
                  onTouchStart={handleScaleStart}
                >
                  <div className="w-6 h-1.5 bg-blue-500 rounded-full shadow-sm" />
                </div>
              </div>
              {/* × delete button */}
              <button
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onClear?.(); setShowSlotClear(false) }}
                className="absolute w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full text-white text-sm flex items-center justify-center shadow-md transition-colors z-10"
                style={{ left: btnLeft, top: btnTop }}
              >×</button>
            </>
          )
        })()}
      </div>

      {/* Toolbar */}
      {!hideToolbar && (
        <div className="self-center ms-3">
          <InlineToolbar
            mode={mode}
            onModeChange={handleModeChange}
            onAutoArch={annotation.addArchStroke}
            onUndo={annotation.undoLast}
            hasStrokes={annotation.strokes.length > 0}
            scale={scale}
            bgColor={bgColor}
            onBgColorChange={handleBgColorChange}
          />
        </div>
      )}

      {/* Text style toolbar — shown while editing */}
      {editingText && (
        <div data-text-toolbar>
          <TextStyleToolbar
            position={{ vx: editingText.vx, vy: editingText.vy }}
            font={editingText.fontFamily}
            color={editingText.color}
            bgColor={editingText.bgColor}
            fontSize={editingText.fontSize}
            textAlign={editingText.textAlign}
            direction={editingText.direction}
            bgShape={editingText.bgShape}
            onFontChange={handleFontChange}
            onColorChange={handleTextColorChange}
            onBgColorChange={handleTextBgColorChange}
            onTextAlignChange={handleTextAlignChange}
            onDirectionChange={handleDirectionChange}
            onBgShapeChange={handleBgShapeChange}
          />
        </div>
      )}

    </div>
  )
})

export default EditableSlot
