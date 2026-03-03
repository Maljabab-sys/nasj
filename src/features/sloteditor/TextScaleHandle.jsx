import { useRef, useCallback } from 'react'
import { TEXT_SIZE_MIN, TEXT_SIZE_MAX } from '../../constants/annotation'

export default function TextScaleHandle({ position, fontSize, onSizeChange }) {
  const dragRef = useRef({ active: false, startY: 0, startSize: 0 })

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { active: true, startY: e.clientY, startSize: fontSize }

    function handleMouseMove(ev) {
      if (!dragRef.current.active) return
      ev.preventDefault()
      // Drag down = bigger, drag up = smaller
      const deltaY = dragRef.current.startY - ev.clientY
      const newSize = Math.round(dragRef.current.startSize + deltaY * 0.3)
      onSizeChange(Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, newSize)))
    }

    function handleMouseUp() {
      dragRef.current.active = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [fontSize, onSizeChange])

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { active: true, startY: e.touches[0].clientY, startSize: fontSize }

    function handleTouchMove(ev) {
      if (!dragRef.current.active || ev.touches.length < 1) return
      ev.preventDefault()
      const deltaY = dragRef.current.startY - ev.touches[0].clientY
      const newSize = Math.round(dragRef.current.startSize + deltaY * 0.3)
      onSizeChange(Math.max(TEXT_SIZE_MIN, Math.min(TEXT_SIZE_MAX, newSize)))
    }

    function handleTouchEnd() {
      dragRef.current.active = false
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
  }, [fontSize, onSizeChange])

  const style = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    transform: 'translate(-50%, 4px)',
    zIndex: 9998,
  }

  return (
    <div
      style={style}
      className="flex flex-col items-center gap-0.5 cursor-ns-resize select-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Visual handle pill */}
      <div className="w-8 h-2 rounded-full bg-blue-500 shadow-md border border-blue-400 opacity-80 hover:opacity-100 transition-opacity" />
      {/* Arrow hint */}
      <svg className="w-3 h-3 text-blue-400 opacity-60" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 0L9 3H3L6 0zM6 12L3 9H9L6 12z" />
      </svg>
    </div>
  )
}
