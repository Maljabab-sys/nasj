import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { RefreshCw, Pencil, Check, AlertCircle, Lock } from 'lucide-react'
import Stagger from '../components/Stagger'

export default function CaptionResultsPage({ lang, batchGen, posts, onNext, onBack, onNavUpdate }) {
  const { t } = useLanguage()
  const {
    batchResults, progress,
    selectCaption, setEditedCaption,
    toggleHashtag, selectAllHashtags, deselectAllHashtags,
    regeneratePost, lastRequestRef,
  } = batchGen

  const isMulti = posts.length > 1

  // Check if all posts have at least one caption selected
  const canProceed = posts.every((p) => {
    const r = batchResults[p.id]
    return r && r.status === 'done' && r.captions.length > 0
  })

  function handleNext() {
    const updatedPosts = posts.map((p) => {
      const r = batchResults[p.id]
      if (!r || r.status !== 'done') return { ...p, selectedCaption: null, selectedHashtags: [] }
      const caption = r.editedCaption ?? r.captions[r.selectedCaptionIndex] ?? ''
      const hashtags = r.hashtags.filter((_, i) => r.selectedHashtags.has(i))
      return { ...p, selectedCaption: caption, selectedHashtags: hashtags }
    })
    onNext({ posts: updatedPosts })
  }

  const handleNextRef = useRef(handleNext)
  handleNextRef.current = handleNext
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    onNavUpdate?.({
      backLabel: t.btnBackSettings || 'Back',
      onBack: () => onBackRef.current?.(),
      nextLabel: t.captionNext,
      onNext: () => handleNextRef.current?.(),
      nextDisabled: !canProceed,
    })
  }, [canProceed, t.captionNext, t.btnBackSettings, onNavUpdate])

  function handleRegenerate(post) {
    const req = lastRequestRef.current || {}
    regeneratePost(post, lang, req.accent || 'neutral', { useImages: req.useImages ?? true })
  }

  return (
    <div className="w-full px-4 pt-8 pb-10">
      <Stagger gap={80} start={40}>
        <div />

        {/* Heading */}
        <div className={`mx-auto w-full text-center mb-2 ${isMulti ? 'max-w-6xl' : 'max-w-lg'}`}>
          <h2 className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-bold mb-1">
            {isMulti ? t.captionResultsHeading : t.captionResultsHeadingSingle}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            {isMulti ? t.captionResultsDesc : t.captionResultsDescSingle}
          </p>
        </div>

        {/* Post cards */}
        <div className={`w-full mx-auto ${isMulti ? 'max-w-6xl grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'max-w-lg space-y-8'}`}>
          {posts.map((post, idx) => (
            <PostResultCard
              key={post.id}
              post={post}
              index={idx}
              result={batchResults[post.id]}
              isMulti={isMulti}
              lang={lang}
              t={t}
              onSelectCaption={(i) => selectCaption(post.id, i)}
              onEditCaption={(text) => setEditedCaption(post.id, text)}
              onToggleHashtag={(i) => toggleHashtag(post.id, i)}
              onSelectAll={() => selectAllHashtags(post.id)}
              onDeselectAll={() => deselectAllHashtags(post.id)}
              onRegenerate={() => handleRegenerate(post)}
            />
          ))}
        </div>

        {/* Privacy note */}
        <div className={`mx-auto w-full ${isMulti ? 'max-w-6xl' : 'max-w-lg'}`}>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Lock className="w-3 h-3" />
            {t.captionPrivacyNoteWithImages}
          </div>
        </div>
      </Stagger>
    </div>
  )
}

function PostResultCard({
  post, index, result, isMulti, t,
  onSelectCaption, onEditCaption,
  onToggleHashtag, onSelectAll, onDeselectAll,
  onRegenerate,
}) {
  const beforeImage = post.beforeCropped
  const afterImage = post.afterCropped
  const isLoading = result?.status === 'loading'
  const isError = result?.status === 'error'
  const isDone = result?.status === 'done'

  return (
    <div className="rounded-xl border border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] overflow-hidden">
      {/* Post header with image preview */}
      <div className="border-b border-stone-100 dark:border-[#222]">
        <div className="flex gap-1 p-1">
          {beforeImage && (
            <img src={beforeImage} alt="Before" className={`${afterImage && afterImage !== beforeImage ? 'w-1/2' : 'w-full'} aspect-square rounded-lg object-cover`} />
          )}
          {afterImage && afterImage !== beforeImage && (
            <img src={afterImage} alt="After" className="w-1/2 aspect-square rounded-lg object-cover" />
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5">
          {isMulti && (
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t.captionPostLabel(index + 1)}
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={onRegenerate}
            disabled={isLoading}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? t.captionRegenerateLoading : t.captionRegeneratePost}
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border border-stone-200 dark:border-[#2a2a2a] p-3">
                <div className="h-3 bg-stone-200 dark:bg-[#2a2a2a] rounded w-full mb-1.5" />
                <div className="h-3 bg-stone-200 dark:bg-[#2a2a2a] rounded w-3/4 mb-1.5" />
                <div className="h-3 bg-stone-200 dark:bg-[#2a2a2a] rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 text-xs">{result.error || t.captionError}</p>
              <button
                onClick={onRegenerate}
                className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
              >
                {t.captionRetry}
              </button>
            </div>
          </div>
        )}

        {/* Captions */}
        {isDone && result.captions.length > 0 && (
          <section>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
              {t.captionSectionLabel}
            </p>
            <div className="space-y-1.5">
              {result.captions.map((caption, i) => (
                <CaptionCard
                  key={i}
                  text={caption}
                  isSelected={result.selectedCaptionIndex === i}
                  onSelect={() => onSelectCaption(i)}
                  isEditing={result.selectedCaptionIndex === i && result.editedCaption !== null}
                  editedText={result.editedCaption}
                  onEdit={onEditCaption}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {/* Hashtags */}
        {isDone && result.hashtags.length > 0 && (
          <section>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
              {t.hashtagSectionLabel}
            </p>
            <div className="flex flex-wrap gap-1">
              {result.hashtags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => onToggleHashtag(i)}
                  className={`py-1 px-2 rounded-full text-[10px] font-medium transition-colors border
                    ${result.selectedHashtags.has(i)
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                      : 'bg-stone-100 dark:bg-[#1a1a1a] border-stone-200 dark:border-[#2a2a2a] text-gray-500 dark:text-gray-400'}
                  `}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={onSelectAll}
                className="text-[9px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {t.hashtagSelectAll}
              </button>
              <button
                onClick={onDeselectAll}
                className="text-[9px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {t.hashtagDeselectAll}
              </button>
            </div>
          </section>
        )}
      </div>
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

  if (!isSelected && editing) setEditing(false)

  return (
    <button
      onClick={!editing ? onSelect : undefined}
      className={`w-full text-start rounded-lg border p-2 transition-colors
        ${isSelected
          ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] hover:border-stone-300 dark:hover:border-[#3a3a3a]'}
      `}
    >
      {editing ? (
        <textarea
          value={editedText ?? text}
          onChange={(e) => onEdit(e.target.value)}
          placeholder={t.captionEditPlaceholder}
          rows={3}
          className="w-full bg-transparent text-gray-700 dark:text-gray-300 text-xs leading-relaxed resize-none focus:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">
          {editedText ?? text}
        </p>
      )}

      {isSelected && (
        <div className="flex justify-end mt-1">
          <span
            onClick={(e) => { e.stopPropagation(); handleEditToggle() }}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {editing ? <><Check className="w-2.5 h-2.5" /> {t.captionEditDone}</> : <><Pencil className="w-2.5 h-2.5" /> {t.captionEdit}</>}
          </span>
        </div>
      )}
    </button>
  )
}
