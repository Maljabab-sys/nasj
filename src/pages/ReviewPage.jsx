import { useState, useEffect, useCallback } from 'react'
import { composite } from '../features/compose/useCompositor'
import { downloadCanvas, downloadAllAsZip } from '../features/compose/downloadCanvas'
import { useLanguage } from '../i18n/LanguageContext'
import { Copy, Check, Download } from 'lucide-react'
import Stagger from '../components/Stagger'

const FORMAT_TO_SIZE = {
  square: '1080x1080',
  portrait: '1080x1350',
  story: '1080x1920',
}

function buildCompositeParams(post, t) {
  const outputSize = FORMAT_TO_SIZE[post.format] || '1080x1080'
  return {
    beforeCropped: post.beforeCropped,
    afterCropped: post.afterCropped,
    beforeStrokes: post.beforeStrokes,
    afterStrokes: post.afterStrokes,
    layoutMode: post.layoutMode,
    singleTarget: post.singleTarget,
    outputSize,
    bgColor: post.bgColor,
    templateId: post.selectedTemplate || 'classic',
    watermarkText: post.watermarkText || '',
    labels: { before: t.slotBefore, after: t.slotAfter },
  }
}

export default function ReviewPage({ posts, onBack, onClearSession }) {
  const { t } = useLanguage()
  const isMulti = posts.length > 1

  const [previews, setPreviews] = useState({})         // { [postId]: dataURL }
  const [downloading, setDownloading] = useState(null)  // null | postId | 'zip'

  // Build previews for all posts
  useEffect(() => {
    let cancelled = false
    async function buildAll() {
      const results = {}
      for (const post of posts) {
        try {
          const canvas = await composite(buildCompositeParams(post, t))
          if (cancelled) return
          results[post.id] = canvas.toDataURL('image/jpeg', 0.7)
        } catch {
          results[post.id] = null
        }
      }
      if (!cancelled) setPreviews(results)
    }
    buildAll()
    return () => { cancelled = true }
  }, [posts, t])

  // Download a single post
  async function handleDownloadPost(post, index) {
    setDownloading(post.id)
    try {
      const canvas = await composite(buildCompositeParams(post, t))
      const date = new Date().toISOString().split('T')[0]
      downloadCanvas(canvas, `nasj-post-${index + 1}-${post.layoutMode}-${date}.png`)
      if (!isMulti) onClearSession?.()
    } finally {
      setDownloading(null)
    }
  }

  // Download all posts as ZIP
  async function handleDownloadAllZip() {
    setDownloading('zip')
    try {
      const date = new Date().toISOString().split('T')[0]
      const items = []
      for (const [i, post] of posts.entries()) {
        const canvas = await composite(buildCompositeParams(post, t))
        items.push({ canvas, filename: `nasj-post-${i + 1}-${post.layoutMode}-${date}.png` })
      }
      await downloadAllAsZip(items, `nasj-posts-${date}.zip`)
      onClearSession?.()
    } finally {
      setDownloading(null)
    }
  }

  // Copy all captions
  const allCaptionText = posts
    .map((p, i) => {
      const parts = []
      if (isMulti) parts.push(`--- Post ${i + 1} ---`)
      if (p.selectedCaption?.trim()) parts.push(p.selectedCaption.trim())
      if (p.selectedHashtags?.length) parts.push(p.selectedHashtags.join(' '))
      return parts.join('\n')
    })
    .filter(Boolean)
    .join('\n\n')

  return (
    <div className="w-full px-4 pb-10">
      <Stagger gap={80} start={40}>
        {/* Spacer — back button handled by NavBar */}
        <div />

        <div className={`mx-auto w-full ${isMulti ? 'max-w-3xl' : 'max-w-sm'}`}>
          <div className="mb-6 text-center">
            <h2 className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-bold mb-1">
              {isMulti ? t.reviewHeadingMulti : t.reviewHeading}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              {isMulti ? t.reviewDescMulti : t.reviewDesc}
            </p>
          </div>

          {/* Bulk actions for multi-post */}
          {isMulti && (
            <div className="flex flex-wrap gap-3 mb-6 justify-center">
              <button
                onClick={handleDownloadAllZip}
                disabled={downloading === 'zip'}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors
                  ${downloading === 'zip'
                    ? 'bg-blue-800 text-blue-300 cursor-wait'
                    : 'bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500'}
                `}
              >
                <Download className="w-4 h-4" />
                {downloading === 'zip' ? t.downloadingZip : t.btnDownloadAll}
              </button>
              {allCaptionText && (
                <CopyButton text={allCaptionText} label={t.btnCopyAllCaptions} t={t} />
              )}
            </div>
          )}

          {/* Post grid */}
          <div className={isMulti
            ? 'grid gap-6 grid-cols-1 sm:grid-cols-2'
            : ''
          }>
            {posts.map((post, idx) => (
              <PostCard
                key={post.id}
                post={post}
                index={idx}
                isMulti={isMulti}
                previewURL={previews[post.id]}
                isDownloading={downloading === post.id}
                onDownload={() => handleDownloadPost(post, idx)}
                t={t}
              />
            ))}
          </div>
        </div>
      </Stagger>
    </div>
  )
}

function PostCard({ post, index, isMulti, previewURL, isDownloading, onDownload, t }) {
  const hasCaption = post.selectedCaption?.trim()?.length > 0
  const hasHashtags = post.selectedHashtags?.length > 0
  const allText = [
    hasCaption ? post.selectedCaption : null,
    hasHashtags ? post.selectedHashtags.join(' ') : null,
  ].filter(Boolean).join('\n\n')

  return (
    <div className={isMulti
      ? 'bg-white dark:bg-[#1a1a1a] rounded-2xl border border-stone-200 dark:border-[#2a2a2a] overflow-hidden'
      : ''
    }>
      {/* Post badge */}
      {isMulti && (
        <div className="px-4 pt-3 pb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            {t.postBadge(index + 1)}
          </span>
        </div>
      )}

      <div className={isMulti ? 'px-4 pb-4' : ''}>
        {/* Image preview */}
        <div className="bg-stone-100 dark:bg-[#0a0a0a] rounded-xl overflow-hidden border border-stone-200 dark:border-[#2a2a2a] flex items-center justify-center min-h-48">
          {previewURL ? (
            <img src={previewURL} alt={`post ${index + 1} preview`} className="w-full h-auto block" />
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
              <CopyButton text={post.selectedCaption} label={t.btnCopyCaption} t={t} />
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-xl p-4">
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {post.selectedCaption}
              </p>
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
              <CopyButton text={post.selectedHashtags.join(' ')} label={t.btnCopyHashtags} t={t} />
            </div>
            <div className="bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-xl p-4">
              <p className="text-blue-600 dark:text-blue-400 text-sm leading-relaxed">
                {post.selectedHashtags.join(' ')}
              </p>
            </div>
          </div>
        )}

        {/* Copy all */}
        {(hasCaption || hasHashtags) && !isMulti && (
          <CopyButton text={allText} label={t.btnCopyAll} t={t} fullWidth className="mt-3" />
        )}

        {/* Download button */}
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors mt-4
            ${isDownloading
              ? 'bg-blue-800 text-blue-300 cursor-wait'
              : 'bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500'}
          `}
        >
          {isDownloading
            ? t.btnGenerating
            : (isMulti ? t.btnDownloadPost(index + 1) : t.btnDownload)
          }
        </button>
      </div>
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
