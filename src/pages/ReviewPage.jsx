import { useState, useEffect, useCallback } from 'react'
import { composite } from '../features/compose/useCompositor'
import { downloadCanvas } from '../features/compose/downloadCanvas'
import { useLanguage } from '../i18n/LanguageContext'
import { Copy, Check } from 'lucide-react'
import Stagger from '../components/Stagger'

const FORMAT_TO_SIZE = {
  square: '1080x1080',
  portrait: '1080x1350',
  story: '1080x1920',
}

export default function ReviewPage({ beforeCropped, afterCropped, beforeStrokes, afterStrokes, layoutMode, singleTarget, format, watermarkText, bgColor, selectedTemplate, selectedCaption, selectedHashtags, onBack, onClearSession }) {
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
    bgColor,
    templateId: selectedTemplate || 'classic',
    watermarkText: watermarkText || '',
    labels: { before: t.slotBefore, after: t.slotAfter },
  }), [beforeCropped, afterCropped, beforeStrokes, afterStrokes, layoutMode, singleTarget, outputSize, bgColor, selectedTemplate, watermarkText, t.slotBefore, t.slotAfter])

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
      onClearSession?.()
    } finally {
      setIsDownloading(false)
    }
  }

  const hasCaption = selectedCaption && selectedCaption.trim().length > 0
  const hasHashtags = selectedHashtags && selectedHashtags.length > 0
  const allText = [hasCaption ? selectedCaption : null, hasHashtags ? selectedHashtags.join(' ') : null].filter(Boolean).join('\n\n')

  return (
    <div className="w-full px-4 pb-10">
      <Stagger gap={80} start={40}>
        {/* Spacer — back button handled by NavBar */}
        <div />

        <div className="max-w-sm mx-auto w-full">
          <div className="mb-6 text-center">
            <h2 className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-bold mb-1">{t.reviewHeading}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{t.reviewDesc}</p>
          </div>

          {/* Image preview */}
          <div className="bg-stone-100 dark:bg-[#0a0a0a] rounded-xl overflow-hidden border border-stone-200 dark:border-[#2a2a2a] flex items-center justify-center min-h-48">
            {previewURL ? (
              <img src={previewURL} alt="post preview" className="w-full h-auto block" />
            ) : (
              <div className="text-gray-400 dark:text-gray-600 text-sm p-8 text-center">{t.previewGenerating}</div>
            )}
          </div>

          {/* Caption section */}
          {hasCaption && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t.reviewCaptionLabel}
                </p>
                <CopyButton text={selectedCaption} label={t.btnCopyCaption} t={t} />
              </div>
              <div className="bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-xl p-4">
                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{selectedCaption}</p>
              </div>
            </div>
          )}

          {/* Hashtags section */}
          {hasHashtags && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t.reviewHashtagsLabel}
                </p>
                <CopyButton text={selectedHashtags.join(' ')} label={t.btnCopyHashtags} t={t} />
              </div>
              <div className="bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-xl p-4">
                <p className="text-blue-600 dark:text-blue-400 text-sm leading-relaxed">{selectedHashtags.join(' ')}</p>
              </div>
            </div>
          )}

          {/* Copy all */}
          {(hasCaption || hasHashtags) && (
            <CopyButton text={allText} label={t.btnCopyAll} t={t} fullWidth className="mt-3" />
          )}

          {/* Download button */}
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

function CopyButton({ text, label, t, fullWidth = false, className = '' }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for insecure contexts
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
        ${copied
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          : 'bg-stone-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-[#252525]'}
        ${fullWidth ? 'w-full justify-center' : ''}
        ${className}
      `}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? t.btnCopied : label}
    </button>
  )
}
