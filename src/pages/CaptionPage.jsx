import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { RefreshCw, Pencil, Check, AlertCircle, Lock, Sparkles } from 'lucide-react'
import Stagger from '../components/Stagger'

export default function CaptionPage({ lang, captionGen, onNext, onBack, onSkip, onNavUpdate }) {
  const { t } = useLanguage()
  const {
    captions, hashtags,
    selectedCaption, selectedHashtags,
    editedCaption, isLoading, isLoadingHashtags, error,
    generate, retry, refresh, refreshHashtags, selectCaption,
    toggleHashtag, selectAllHashtags, deselectAllHashtags,
    setEditedCaption, finalCaption, finalHashtags,
    description, setDescription,
    accent, setAccent,
  } = captionGen

  const hasResults = captions.length > 0 || hashtags.length > 0

  const isArabic = lang === 'ar'

  const ACCENT_FLAGS = {
    saudi: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f1f8-1f1e6.svg',
    egyptian: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f1ea-1f1ec.svg',
  }

  const accentOptions = isArabic ? [
    { value: 'neutral', label: t.accentNeutral },
    { value: 'saudi', label: t.accentSaudi, flag: ACCENT_FLAGS.saudi },
    { value: 'gulf', label: t.accentGulf },
    { value: 'egyptian', label: t.accentEgyptian, flag: ACCENT_FLAGS.egyptian },
  ] : null

  function handleGenerate() {
    if (description.trim()) {
      generate(description, lang, accent)
    }
  }

  function handleNext() {
    onNext({ selectedCaption: finalCaption, selectedHashtags: finalHashtags })
  }

  const handleNextRef = useRef(handleNext)
  handleNextRef.current = handleNext

  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  const canProceed = finalCaption.trim().length > 0 || finalHashtags.length > 0

  // Report nav state to NavBar
  useEffect(() => {
    onNavUpdate?.({
      backLabel: t.btnBackUpload || 'Back',
      onBack: () => onBackRef.current?.(),
      nextLabel: t.captionNext,
      onNext: () => handleNextRef.current?.(),
      nextDisabled: !canProceed,
    })
  }, [canProceed, t.captionNext, t.btnBackUpload, onNavUpdate])

  return (
    <div className="w-full px-4 pb-10">
      <Stagger gap={80} start={40}>
        {/* Spacer — back button handled by NavBar */}
        <div />

        {/* Heading */}
        <div className="max-w-lg mx-auto w-full text-center mb-2">
          <h2 className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-bold mb-1">{t.captionHeading}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{t.captionDesc}</p>
        </div>

        {/* Main content */}
        <div className="max-w-lg mx-auto w-full space-y-6">

          {/* Describe your post */}
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              {t.captionDescribeLabel}
            </p>
            <div className="rounded-xl border border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] p-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.captionDescribePlaceholder}
                rows={3}
                className="w-full bg-transparent text-gray-700 dark:text-gray-300 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>
            {/* Accent selector — Arabic only */}
            {accentOptions && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">
                  {t.accentLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {accentOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAccent(opt.value)}
                      className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium transition-colors border
                        ${accent === opt.value
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                          : 'bg-stone-100 dark:bg-[#1a1a1a] border-stone-200 dark:border-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:border-stone-300 dark:hover:border-[#3a3a3a]'}
                      `}
                    >
                      {opt.flag && <img src={opt.flag} alt="" className="w-4 h-4" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {description.trim() && (
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex items-center gap-1.5 mt-3 px-4 py-2 rounded-xl text-sm font-medium bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isLoading ? t.captionLoading : t.captionGenerateBtn}
              </button>
            )}
          </section>

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-700 dark:text-red-300 text-sm">{t.captionError}</p>
                <button
                  onClick={retry}
                  className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  {t.captionRetry}
                </button>
              </div>
            </div>
          )}

          {/* Caption selection (skeleton when loading, cards when ready) */}
          {(isLoading || captions.length > 0) && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {t.captionSectionLabel}
              </p>
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="animate-pulse rounded-xl border border-stone-200 dark:border-[#2a2a2a] p-4">
                      <div className="h-4 bg-stone-200 dark:bg-[#2a2a2a] rounded w-full mb-2" />
                      <div className="h-4 bg-stone-200 dark:bg-[#2a2a2a] rounded w-3/4 mb-2" />
                      <div className="h-4 bg-stone-200 dark:bg-[#2a2a2a] rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {captions.map((caption, i) => (
                    <CaptionCard
                      key={i}
                      text={caption}
                      isSelected={selectedCaption === i}
                      onSelect={() => selectCaption(i)}
                      isEditing={selectedCaption === i && editedCaption !== null}
                      editedText={editedCaption}
                      onEdit={setEditedCaption}
                      t={t}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => refresh(lang)}
                disabled={isLoading}
                className="flex items-center gap-1.5 mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                {t.captionRefresh}
              </button>
            </section>
          )}

          {/* Hashtag selection */}
          {(isLoadingHashtags || hashtags.length > 0) && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                {t.hashtagSectionLabel}
              </p>
              {isLoadingHashtags ? (
                <div className="flex flex-wrap gap-2 animate-pulse">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="h-9 bg-stone-200 dark:bg-[#2a2a2a] rounded-full" style={{ width: `${60 + (i % 3) * 30}px` }} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => toggleHashtag(i)}
                      className={`py-2 px-3 rounded-full text-sm font-medium transition-colors border
                        ${selectedHashtags.has(i)
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                          : 'bg-stone-100 dark:bg-[#1a1a1a] border-stone-200 dark:border-[#2a2a2a] text-gray-500 dark:text-gray-400'}
                      `}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button
                  onClick={selectAllHashtags}
                  disabled={isLoadingHashtags}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  {t.hashtagSelectAll}
                </button>
                <button
                  onClick={deselectAllHashtags}
                  disabled={isLoadingHashtags}
                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  {t.hashtagDeselectAll}
                </button>
              </div>
              <button
                onClick={() => refreshHashtags(lang)}
                disabled={isLoadingHashtags}
                className="flex items-center gap-1.5 mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHashtags ? 'animate-spin' : ''}`} />
                {t.hashtagRefresh}
              </button>
            </section>
          )}

          {/* Privacy note */}
          {(hasResults || isLoading || error) && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <Lock className="w-3 h-3" />
              {t.captionPrivacyNote}
            </div>
          )}

          {/* Skip link */}
          <div className="pt-4 text-center">
            <button
              onClick={onSkip}
              className="text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {t.captionSkip}
            </button>
          </div>
        </div>
      </Stagger>
    </div>
  )
}

function CaptionCard({ text, isSelected, onSelect, isEditing, editedText, onEdit, t }) {
  const [editing, setEditing] = useState(false)

  function handleEditToggle() {
    if (editing) {
      setEditing(false)
    } else {
      onEdit(editedText ?? text)
      setEditing(true)
    }
  }

  // Reset local editing state when card is deselected
  if (!isSelected && editing) setEditing(false)

  return (
    <button
      onClick={!editing ? onSelect : undefined}
      className={`w-full text-start rounded-xl border p-4 transition-colors
        ${isSelected
          ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:border-stone-300 dark:hover:border-[#3a3a3a]'}
      `}
    >
      {editing ? (
        <textarea
          value={editedText ?? text}
          onChange={(e) => onEdit(e.target.value)}
          placeholder={t.captionEditPlaceholder}
          rows={4}
          className="w-full bg-transparent text-gray-700 dark:text-gray-300 text-sm leading-relaxed resize-none focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {editedText ?? text}
        </p>
      )}

      {isSelected && (
        <div className="flex justify-end mt-2">
          <span
            onClick={(e) => { e.stopPropagation(); handleEditToggle() }}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {editing ? <><Check className="w-3 h-3" /> {t.captionEditDone}</> : <><Pencil className="w-3 h-3" /> {t.captionEdit}</>}
          </span>
        </div>
      )}
    </button>
  )
}
