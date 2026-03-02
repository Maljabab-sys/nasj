import { useState, useEffect, useRef, useCallback } from 'react'
import { composite } from '../features/compose/useCompositor'
import { downloadCanvas } from '../features/compose/downloadCanvas'
import { DEFAULT_DOCTOR_NAME } from '../constants/layout'
import { useLanguage } from '../i18n/LanguageContext'
import Stagger from '../components/Stagger'

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function ComposePage({ beforeCropped, afterCropped, beforeStrokes, afterStrokes, initialLayout, initialSingleTarget, onBack }) {
  const { t } = useLanguage()

  const LAYOUT_OPTIONS = [
    { id: 'stacked', label: t.layoutStacked, desc: t.layoutStackedDesc },
    { id: 'sidebyside', label: t.layoutSideBySide, desc: t.layoutSideBySideDesc },
    { id: 'single', label: t.layoutSingleImage, desc: t.layoutSingleImageDesc },
  ]

  const SIZE_OPTIONS = [
    { id: '1080x1080', label: '1080 × 1080', desc: t.size1080Desc },
    { id: '1080x1350', label: '1080 × 1350', desc: t.size1350Desc },
  ]

  const [layoutMode, setLayoutMode] = useState(initialLayout ?? 'stacked')
  const [singleTarget, setSingleTarget] = useState(initialSingleTarget ?? 'before')
  const [doctorName, setDoctorName] = useState(DEFAULT_DOCTOR_NAME)
  const [outputSize, setOutputSize] = useState('1080x1080')
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewURL, setPreviewURL] = useState(null)

  const previewCanvasRef = useRef(null)
  const debouncedName = useDebounce(doctorName, 350)

  const buildCompositeParams = useCallback(() => ({
    beforeCropped,
    afterCropped,
    beforeStrokes,
    afterStrokes,
    layoutMode,
    singleTarget,
    doctorName: debouncedName || DEFAULT_DOCTOR_NAME,
    outputSize,
  }), [beforeCropped, afterCropped, beforeStrokes, afterStrokes, layoutMode, singleTarget, debouncedName, outputSize])

  // Update preview whenever settings change
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
      downloadCanvas(canvas, `ortho-post-${layoutMode}-${date}.png`)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 pb-10">
      <Stagger gap={80} start={40}>
        <div className="mb-6">
          <h2 className="text-gray-900 dark:text-white text-lg font-semibold">{t.composeHeading}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t.composeDesc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Preview — shown first on mobile */}
        <div className="flex flex-col gap-2 lg:hidden">
          <label className="text-gray-700 dark:text-gray-300 text-xs font-semibold uppercase tracking-widest">
            {t.labelPreview}
          </label>
          <div className="bg-stone-100 dark:bg-[#0a0a0a] rounded-xl overflow-hidden border border-stone-200 dark:border-[#2a2a2a] flex items-center justify-center min-h-48">
            {previewURL ? (
              <img src={previewURL} alt="post preview" className="w-full h-auto block" />
            ) : (
              <div className="text-gray-400 dark:text-gray-600 text-sm p-8 text-center">{t.previewGenerating}</div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6">
          {/* Layout */}
          <div>
            <label className="text-gray-700 dark:text-gray-300 text-xs font-semibold uppercase tracking-widest mb-2 block">
              {t.labelLayout}
            </label>
            <div className="flex flex-col gap-2">
              {LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setLayoutMode(opt.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors
                    ${layoutMode === opt.id
                      ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-gray-900 dark:text-white'
                      : 'bg-white dark:bg-[#1a1a1a] border-stone-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:border-stone-400 dark:hover:border-[#444]'}
                  `}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0
                    ${layoutMode === opt.id ? 'border-blue-400 bg-blue-500' : 'border-stone-400 dark:border-[#555]'}
                  `} />
                  <div>
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {layoutMode === 'single' && (
              <div className="flex gap-2 mt-2 pl-1">
                {['before', 'after'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSingleTarget(s)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize
                      ${singleTarget === s ? 'bg-blue-700 dark:bg-blue-600 text-white' : 'bg-stone-200 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}
                    `}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Doctor name */}
          <div>
            <label className="text-gray-700 dark:text-gray-300 text-xs font-semibold uppercase tracking-widest mb-2 block">
              {t.labelWatermark}
            </label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="DR.MHANNA ALJABAB"
              className="w-full bg-white dark:bg-[#1a1a1a] border border-stone-300 dark:border-[#3a3a3a] rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Output size */}
          <div>
            <label className="text-gray-700 dark:text-gray-300 text-xs font-semibold uppercase tracking-widest mb-2 block">
              {t.labelOutputSize}
            </label>
            <div className="flex gap-2">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setOutputSize(opt.id)}
                  className={`flex-1 px-3 py-2.5 rounded-xl border text-left text-xs transition-colors
                    ${outputSize === opt.id
                      ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 text-gray-900 dark:text-white'
                      : 'bg-white dark:bg-[#1a1a1a] border-stone-200 dark:border-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:border-stone-400 dark:hover:border-[#444]'}
                  `}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-colors mt-2
              ${isDownloading
                ? 'bg-blue-800 text-blue-300 cursor-wait'
                : 'bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500'}
            `}
          >
            {isDownloading ? t.btnGenerating : t.btnDownload}
          </button>

          <button
            onClick={onBack}
            className="text-gray-500 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-center"
          >
            {t.btnBackAnnotate}
          </button>
        </div>

        {/* Live preview — desktop only (mobile version shown above) */}
        <div className="hidden lg:flex flex-col gap-2">
          <label className="text-gray-700 dark:text-gray-300 text-xs font-semibold uppercase tracking-widest">
            {t.labelPreview}
          </label>
          <div className="bg-stone-100 dark:bg-[#0a0a0a] rounded-xl overflow-hidden border border-stone-200 dark:border-[#2a2a2a] flex items-center justify-center min-h-48">
            {previewURL ? (
              <img
                src={previewURL}
                alt="post preview"
                className="w-full h-auto block"
              />
            ) : (
              <div className="text-gray-400 dark:text-gray-600 text-sm p-8 text-center">{t.previewGenerating}</div>
            )}
          </div>
          <p className="text-gray-400 dark:text-gray-600 text-xs text-center">{t.previewNote}</p>
        </div>
      </div>

        {/* Hidden preview canvas (unused, kept as ref) */}
        <canvas ref={previewCanvasRef} className="hidden" />
      </Stagger>
    </div>
  )
}
