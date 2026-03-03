import { useRef, useCallback } from 'react'
import { TEXT_SIZE_MIN, TEXT_SIZE_MAX } from '../../constants/annotation'

// Small circle handle at a corner
function CornerHandle({ position, cursor, onResizeStart }) {
  return (
    <div
      className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full pointer-events-auto"
      style={{
        ...position,
        transform: 'translate(-50%, -50%)',
        cursor,
      }}
      onMouseDown={onResizeStart}
      onTouchStart={onResizeStart}
    />
  )
}

export default function TextSelectionBox({ bounds, fontSize, onSizeChange }) {
  const dragRef = useRef({ active: false, startY: 0, startSize: 0 })

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    dragRef.current = { active: true, startY: clientY, startSize: fontSize }

    function handleMove(ev) {
      if (!dragRef.current.active) return
      ev.preventDefault()
      const cy = ev.touches ? ev.touches[0].clientY : ev.clientY
      // Drag down = bigger, drag up = smaller
      const deltaY = cy - dragRef.current.startY
      const newSize = Math.round(dragRef.current.startSize + deltaY * 0.4)
      onSizeChange(Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, newSize)))
    }

    function handleEnd() {
      dragRef.current.active = false
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }, [fontSize, onSizeChange])

  if (!bounds) return null

  const { left, top, width, height } = bounds

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{ left, top, width, height }}
      data-scale-handle
    >
      {/* Dashed selection border */}
      <div className="w-full h-full border-[1.5px] border-dashed border-blue-400 rounded-sm" />

      {/* Corner handles */}
      <CornerHandle position={{ top: 0, left: 0 }} cursor="nw-resize" onResizeStart={handleResizeStart} />
      <CornerHandle position={{ top: 0, right: 0, left: 'auto' }} cursor="ne-resize" onResizeStart={handleResizeStart} />
      <CornerHandle position={{ bottom: 0, top: 'auto', left: 0 }} cursor="sw-resize" onResizeStart={handleResizeStart} />
      <CornerHandle position={{ bottom: 0, top: 'auto', right: 0, left: 'auto' }} cursor="se-resize" onResizeStart={handleResizeStart} />

      {/* Bottom-center resize indicator */}
      <div
        className="absolute pointer-events-auto cursor-ns-resize"
        style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 50%)' }}
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
        <div className="w-6 h-1.5 bg-blue-500 rounded-full shadow-sm" />
      </div>
    </div>
  )
}
