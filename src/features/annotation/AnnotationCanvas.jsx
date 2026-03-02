import { useEffect } from 'react'
import { useAnnotation } from './useAnnotation'
import AnnotationToolbar from './AnnotationToolbar'
import { useLanguage } from '../../i18n/LanguageContext'

export default function AnnotationCanvas({ imageDataURL, initialStrokes, onStrokesChange }) {
  const { t } = useLanguage()
  const {
    canvasRef,
    activeTool,
    setActiveTool,
    strokes,
    setStrokes,
    handlers,
    cursor,
    undoLast,
    clearAll,
    addArchStroke,
  } = useAnnotation(imageDataURL)

  // Seed initial strokes when component mounts or image changes
  useEffect(() => {
    if (initialStrokes && initialStrokes.length > 0) {
      setStrokes(initialStrokes)
    }
  }, [imageDataURL]) // eslint-disable-line

  // Propagate strokes changes upward
  useEffect(() => {
    onStrokesChange(strokes)
  }, [strokes]) // eslint-disable-line

  const activeTip = activeTool === 'free' ? t.tipFreeDraw : t.tipPointToPoint

  return (
    <div className="flex flex-col gap-3">
      <AnnotationToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onAutoArch={addArchStroke}
        onUndo={undoLast}
        onClear={clearAll}
        hasStrokes={strokes.length > 0}
      />

      <p className="text-gray-500 text-xs">{activeTip}</p>

      <div className="relative rounded-xl overflow-hidden bg-black" style={{ userSelect: 'none' }}>
        <img
          src={imageDataURL}
          alt="annotation target"
          className="w-full h-auto block"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor, touchAction: 'none' }}
          {...handlers}
        />
      </div>
    </div>
  )
}
