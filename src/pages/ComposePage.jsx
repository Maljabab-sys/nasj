import { useState, useEffect, useCallback } from 'react'
import { composite } from '../features/compose/useCompositor'
import { downloadCanvas } from '../features/compose/downloadCanvas'
import { useLanguage } from '../i18n/LanguageContext'
import Stagger from '../components/Stagger'

const FORMAT_TO_SIZE = {
  square: '1080x1080',
  portrait: '1080x1350',
  story: '1080x1920',
}

export default function ComposePage({ beforeCropped, afterCropped, beforeStrokes, afterStrokes, layoutMode, singleTarget, format, onBack }) {
  const { t } = useLanguage()

  const [isDownloading, setIsDownloading] = useState(false)
  const [previewURL, setPreviewURL] = useState(null)

  const outputSize = FORMAT_TO_SIZE[format] || '1080x1080'

  const buildCompositeParams = useCallback(() => ({
    beforeCropped,
    afterCropped,
    beforeStrokes,
    afterStrokes,
    layoutMode,
    singleTarget,
    outputSize,
  }), [beforeCropped, afterCropped, beforeStrokes, afterStrokes, layoutMode, singleTarget, outputSize])

  useEffect(() => {
    let cancelled = false
    async function buildPreview() {
      const canvas = await composite(buildCompositeParams())
      if (!cancelled) setPreviewURL(canvas.toDataURL('image/jpeg', 0.7))
    }
    buildPreview()
    return () => { cancelled = true }
  }, [buildCompositeParams])

  async function handleDownload() {
    setIsDownloading(true)
    try {
      const canvas = await composite(buildCompositeParams())
      const date = new Date().toISOString().split('T')[0]
      downloadCanvas(canvas, `nasj-post-${layoutMode}-${date}.png`)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="w-full px-4 pb-10">
      <Stagger gap={80} start={40}>
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-sm font-medium transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10 px-3 py-1.5 -ml-3"
          >
            <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            {t.btnBackUpload}
          </button>
        </div>

        <div className="max-w-sm mx-auto w-full">
          <div className="mb-6 text-center">
            <h2 className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-bold mb-1">{t.composeHeading}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{t.composeDesc}</p>
          </div>

          <div className="bg-stone-100 dark:bg-[#0a0a0a] rounded-xl overflow-hidden border border-stone-200 dark:border-[#2a2a2a] flex items-center justify-center min-h-48">
            {previewURL ? (
              <img src={previewURL} alt="post preview" className="w-full h-auto block" />
            ) : (
              <div className="text-gray-400 dark:text-gray-600 text-sm p-8 text-center">{t.previewGenerating}</div>
            )}
          </div>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors mt-4
              ${isDownloading
                ? 'bg-blue-800 text-blue-300 cursor-wait'
                : 'bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500'}
            `}
          >
            {isDownloading ? t.btnGenerating : t.btnDownload}
          </button>
        </div>
      </Stagger>
    </div>
  )
}
