import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { Sparkles, ChevronDown, ImagePlus, Loader2 } from 'lucide-react'
import Stagger from '../components/Stagger'

export default function CaptionPage({ lang, batchGen, posts, onNext, onBack, onSkip, onNavUpdate }) {
  const { t } = useLanguage()
  const {
    description, setDescription,
    accent, setAccent,
    platform, setPlatform,
    provider, setProvider,
    progress, generateAll,
  } = batchGen

  const [modelOpen, setModelOpen] = useState(false)
  const modelRef = useRef(null)

  const isArabic = lang === 'ar'
  const isMulti = posts.length > 1
  const isGenerating = progress.phase === 'generating'

  // Check if any post has images
  const hasImages = posts.some((p) => p.beforeCropped || p.afterCropped)

  const MODEL_OPTIONS = [
    { value: 'claude', label: t.providerClaude, sub: 'Sonnet 4.6', color: 'text-orange-500' },
    { value: 'haiku', label: t.providerHaiku, sub: 'Haiku 4.5', color: 'text-purple-500' },
    { value: 'gemini', label: t.providerGemini, sub: '2.5 Flash', color: 'text-blue-500' },
  ]
  const activeModel = MODEL_OPTIONS.find((m) => m.value === provider) || MODEL_OPTIONS[0]

  const ACCENT_FLAGS = {
    saudi: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f1f8-1f1e6.svg',
    egyptian: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f1ea-1f1ec.svg',
  }

  const SOCIAL_ICONS = {
    instagram: 'https://cdn.simpleicons.org/instagram/6b7280',
    tiktok: 'https://cdn.simpleicons.org/tiktok/6b7280',
    snapchat: 'https://cdn.simpleicons.org/snapchat/6b7280',
    twitter: 'https://cdn.simpleicons.org/x/6b7280',
  }

  const platformOptions = [
    { value: 'instagram', label: t.platformInstagram },
    { value: 'tiktok',   label: t.platformTikTok },
    { value: 'snapchat', label: t.platformSnapchat },
    { value: 'twitter',  label: t.platformTwitter },
  ]

  const accentOptions = isArabic ? [
    { value: 'neutral', label: t.accentNeutral },
    { value: 'saudi', label: t.accentSaudi, flag: ACCENT_FLAGS.saudi },
    { value: 'gulf', label: t.accentGulf },
    { value: 'egyptian', label: t.accentEgyptian, flag: ACCENT_FLAGS.egyptian },
  ] : null

  // Close model picker on outside click
  useEffect(() => {
    if (!modelOpen) return
    function handleClick(e) {
      if (modelRef.current && !modelRef.current.contains(e.target)) setModelOpen(false)
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [modelOpen])

  // Generate from photos
  async function handleGenerateFromPhotos() {
    await generateAll(posts, lang, accent, { useImages: true })
    onNext()
  }

  // Generate from text description
  async function handleGenerateFromText() {
    await generateAll(posts, lang, accent, { useImages: false })
    onNext()
  }

  // Nav — hide next button (generation auto-advances), show back
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    onNavUpdate?.({
      backLabel: t.btnBackUpload || 'Back',
      onBack: () => onBackRef.current?.(),
    })
  }, [t.btnBackUpload, onNavUpdate])

  return (
    <div className="w-full px-4 pt-8 pb-10">
      <Stagger gap={80} start={40}>
        <div />

        {/* Heading */}
        <div className="max-w-lg mx-auto w-full text-center mb-2">
          <h2 className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-bold mb-1">{t.captionHeading}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{t.captionDesc}</p>
        </div>

        <div className="max-w-lg mx-auto w-full space-y-6">

          {/* Settings */}
          <section className="space-y-3">
            {/* Platform */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t.captionLabelPlatform}</p>
              <div className="flex flex-wrap gap-1">
                {platformOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPlatform(opt.value)}
                    className={`inline-flex items-center gap-1 py-1 px-2 rounded-full text-[10px] font-medium transition-colors border
                      ${platform === opt.value
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                        : 'bg-stone-100 dark:bg-[#1a1a1a] border-stone-200 dark:border-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:border-stone-300 dark:hover:border-[#3a3a3a]'}
                    `}
                  >
                    <img src={SOCIAL_ICONS[opt.value]} alt={opt.label} className="w-3 h-3" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t.captionLabelModel}</p>
              <div className="relative" ref={modelRef}>
                <button
                  onClick={() => setModelOpen((p) => !p)}
                  className="inline-flex items-center gap-1 py-1 px-2 rounded-full text-[10px] font-medium transition-colors border bg-stone-100 dark:bg-[#1a1a1a] border-stone-200 dark:border-[#2a2a2a] hover:border-stone-300 dark:hover:border-[#3a3a3a]"
                >
                  <span className={`font-bold ${activeModel.color}`}>{activeModel.label}</span>
                  <span className="text-[9px] text-gray-400">{activeModel.sub}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-gray-400" />
                </button>
                {modelOpen && (
                  <div className="absolute top-full mt-1 ltr:left-0 rtl:right-0 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-lg shadow-lg py-1 min-w-[140px] z-50 animate-[popoverIn_150ms_ease-out]">
                    {MODEL_OPTIONS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => { setProvider(m.value); setModelOpen(false) }}
                        className={`w-full px-3 py-1 flex items-center gap-2 text-left transition-colors hover:bg-stone-50 dark:hover:bg-[#222]
                          ${provider === m.value ? 'bg-stone-50 dark:bg-[#222]' : ''}
                        `}
                      >
                        <span className={`text-[10px] font-bold ${m.color}`}>{m.label}</span>
                        <span className="text-[9px] text-gray-400">{m.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Accent — Arabic only */}
            {accentOptions && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t.captionLabelAccent}</p>
                <div className="flex flex-wrap gap-1">
                  {accentOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAccent(opt.value)}
                      className={`inline-flex items-center gap-1 py-1 px-2 rounded-full text-[10px] font-medium transition-colors border
                        ${accent === opt.value
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                          : 'bg-stone-100 dark:bg-[#1a1a1a] border-stone-200 dark:border-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:border-stone-300 dark:hover:border-[#3a3a3a]'}
                      `}
                    >
                      {opt.flag && <img src={opt.flag} alt="" className="w-3 h-3" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Generating progress overlay */}
          {isGenerating && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-6 text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {t.captionGeneratingProgress(progress.current, progress.total)}
              </p>
            </div>
          )}

          {/* Generate from photos */}
          {!isGenerating && hasImages && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {t.captionFromPhotosLabel}
              </p>
              <div className="rounded-xl border border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] p-4">
                {/* Thumbnail grid of all posts */}
                <div className="flex flex-wrap gap-3 mb-3">
                  {posts.map((post, idx) => {
                    const before = post.beforeCropped
                    const after = post.afterCropped
                    if (!before && !after) return null
                    return (
                      <div key={post.id} className="flex gap-1.5 items-center">
                        {isMulti && (
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">{idx + 1}</span>
                        )}
                        {before && <img src={before} alt="" className="w-10 h-10 rounded-lg object-cover border border-stone-200 dark:border-[#2a2a2a]" />}
                        {after && after !== before && <img src={after} alt="" className="w-10 h-10 rounded-lg object-cover border border-stone-200 dark:border-[#2a2a2a]" />}
                      </div>
                    )
                  })}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t.captionFromPhotosDesc}</p>
                <button
                  onClick={handleGenerateFromPhotos}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ImagePlus className="w-4 h-4" />
                  {isMulti ? t.captionGenerateAllBtn : t.captionGenerateSingleBtn}
                </button>
              </div>
            </section>
          )}

          {/* OR divider */}
          {!isGenerating && hasImages && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200 dark:bg-[#2a2a2a]" />
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">{t.captionOrDivider}</span>
              <div className="flex-1 h-px bg-stone-200 dark:bg-[#2a2a2a]" />
            </div>
          )}

          {/* Describe your post */}
          {!isGenerating && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {t.captionDescribeLabel}
              </p>
              <div className="rounded-xl border border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a]">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.captionDescribePlaceholder}
                  rows={3}
                  className="w-full bg-transparent text-gray-700 dark:text-gray-300 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 px-4 pt-4 pb-2"
                />
                <div className="flex items-center justify-end px-3 pb-3">
                  <button
                    onClick={handleGenerateFromText}
                    disabled={!description.trim() || isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isMulti ? t.captionGenerateAllBtn : t.captionGenerateSingleBtn}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Skip link */}
          {!isGenerating && (
            <div className="pt-4 text-center">
              <button
                onClick={onSkip}
                className="text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {t.captionSkip}
              </button>
            </div>
          )}
        </div>
      </Stagger>
    </div>
  )
}
