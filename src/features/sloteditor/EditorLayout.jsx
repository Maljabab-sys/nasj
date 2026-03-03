import { useState, useRef, useEffect } from 'react'
import { Move, Pencil, Type, Undo2, ZoomIn, ZoomOut, Paintbrush, LayoutTemplate, Upload, ImagePlus, Sparkles, Loader2, X, ImageUp, ChevronDown, RefreshCw } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import { DEFAULT_DOCTOR_NAME } from '../../constants/layout'
import { DRAW_COLORS, DRAW_LINE_WIDTHS, DASH_PATTERN } from '../../constants/annotation'
import { useImageGenerator } from './useImageGenerator'
import SidebarButton from './SidebarButton'
import PhotoPanel from './PhotoPanel'
import InlineToolbar from './InlineToolbar'

// ── Popover animation class ──────────────────────────────────────────────────
const popoverAnim = 'animate-[popoverIn_150ms_ease-out]'

// ── BG color options (same as InlineToolbar) ─────────────────────────────────
const BG_OPTIONS = [
  { value: 'black', color: '#0a0a0a', label: 'bgBlack' },
  { value: 'white', color: '#ffffff', label: 'bgWhite' },
  { value: 'transparent', color: null, label: 'bgTransparent' },
]

function CheckerPattern() {
  return (
    <svg className="w-full h-full" viewBox="0 0 16 16">
      <rect width="8" height="8" fill="#ccc" />
      <rect x="8" y="8" width="8" height="8" fill="#ccc" />
      <rect x="8" width="8" height="8" fill="#fff" />
      <rect y="8" width="8" height="8" fill="#fff" />
    </svg>
  )
}

// ── Template options ─────────────────────────────────────────────────────────
const TEMPLATE_OPTIONS = [
  { id: 'classic', labelKey: 'templateClassic', descKey: 'templateClassicDesc' },
  { id: 'clean', labelKey: 'templateClean', descKey: 'templateCleanDesc' },
  { id: 'elegant', labelKey: 'templateElegant', descKey: 'templateElegantDesc' },
]

// ── Mobile bottom nav button ──────────────────────────────────────────────────
function MobileNavBtn({ icon, label, active, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-1 flex-shrink-0 w-16 py-2 rounded-xl transition-colors
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
        ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
      `}
    >
      {icon}
      <span className="text-[10px] font-medium leading-tight truncate w-full text-center">{label}</span>
    </button>
  )
}

export default function EditorLayout({
  // State
  images, posts, slotDataMap, activePostId, onActivePostChange,
  selectedImageId, selectedTemplate,
  watermarkText, bulkDragging,
  dragOver, lang,
  // Active slot
  effectiveActiveSlot, activeState, activeRef,
  // Refs
  inputRef,
  // Callbacks
  onFileInput, onBulkDrop, setBulkDragging,
  onRemoveImage, onGalleryDragStart, onGalleryTap,
  onTemplateTap, onTemplateDrop, onTemplateDragOver, onSetDragOver,
  onToolbarModeChange, onToolbarBgChange, drawSettings, onDrawSettingsChange, onTemplateChange, onWatermarkChange,
  // AI Image
  onAIImageGenerated,
  onAIImageForPost,
  // Render
  renderTemplateForPost,
}) {
  const { t } = useLanguage()

  // Flatten slotDataMap into a pseudo-flat object so PhotoPanel's inSlot check works
  const flatSlotData = {}
  if (slotDataMap) {
    let idx = 0
    for (const pid of Object.keys(slotDataMap)) {
      const postSlots = slotDataMap[pid]
      if (!postSlots) continue
      for (const key of Object.keys(postSlots)) {
        if (postSlots[key]) flatSlotData[`${pid}-${key}-${idx++}`] = postSlots[key]
      }
    }
  }

  const [photoPanelOpen, setPhotoPanelOpen] = useState(false)
  const [activePopover, setActivePopover] = useState(null) // null | 'ai' | 'bg' | 'template' | 'draw' | 'aiImage'
  const [mobileTab, setMobileTab] = useState(null) // null | 'uploads' | 'draw' | 'ai' | 'bg' | 'template' | 'aiImage'
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiModel, setAiModel] = useState('imagen-4.0-fast-generate-001')
  const [aiModelOpen, setAiModelOpen] = useState(false)
  const [aiRefImage, setAiRefImage] = useState(null) // { name, dataURL }
  const aiFileRef = useRef(null)
  const aiModelRef = useRef(null)
  const lastAiSettingsRef = useRef(null) // { prompt, model, refImage } — preserved after generation

  // AI Image generation hook
  const { generate: generateAIImage, generateBatch, isLoading: aiImageLoading, error: aiImageError, clearError: clearAIImageError, elapsed: aiElapsed, cancel: cancelAIImage, batchProgress } = useImageGenerator()

  // Refs for outside-click detection
  const aiImageRef = useRef(null)
  const bgRef = useRef(null)
  const templateRef = useRef(null)
  const drawRef = useRef(null)

  const AI_MODEL_OPTIONS = [
    { value: 'imagen-4.0-fast-generate-001', label: t.aiModelImagen4 || 'Imagen 4 Fast', sub: t.aiModelImagen4Sub || 'Fastest', color: 'text-green-500' },
    { value: 'gemini-2.5-flash-image', label: t.aiModelFlash25 || 'Gemini 2.5 Flash', sub: t.aiModelFlash25Sub || 'Fast & Stable', color: 'text-blue-500' },
    { value: 'gemini-3.1-flash-image-preview', label: t.aiModelFlash || 'Gemini 3.1 Flash', sub: t.aiModelFlashSub || 'Fast', color: 'text-cyan-500' },
    { value: 'gemini-3-pro-image-preview', label: t.aiModelPro || 'Gemini 3 Pro', sub: t.aiModelProSub || 'Best Quality', color: 'text-purple-500' },
  ]
  const activeAiModel = AI_MODEL_OPTIONS.find((m) => m.value === aiModel) || AI_MODEL_OPTIONS[0]

  // Close AI model picker on outside click
  useEffect(() => {
    if (!aiModelOpen) return
    function handleClick(e) {
      if (aiModelRef.current && !aiModelRef.current.contains(e.target)) setAiModelOpen(false)
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [aiModelOpen])

  // Close popover on outside click
  useEffect(() => {
    if (!activePopover) return
    function handleClick(e) {
      const refMap = { aiImage: aiImageRef, bg: bgRef, template: templateRef, draw: drawRef }
      const ref = refMap[activePopover]
      if (ref?.current && !ref.current.contains(e.target)) setActivePopover(null)
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [activePopover])

  // ── Tool handlers ────────────────────────────────────────────────────────
  function selectTool(mode) {
    setPhotoPanelOpen(false)
    setActivePopover(null)
    onToolbarModeChange(mode)
  }

  function togglePhotos() {
    setPhotoPanelOpen((prev) => !prev)
    setActivePopover(null)
  }

  function togglePopover(name) {
    setActivePopover((prev) => (prev === name ? null : name))
    setAiModelOpen(false)
  }

  function handleAutoArch(type) {
    activeRef?.current?.addArchStroke(type)
    setActivePopover(null)
  }

  function handleBgSelect(bg) {
    onToolbarBgChange(bg)
    setActivePopover(null)
  }

  // Get the active post object
  const activePost = posts?.find((p) => p.id === activePostId) || posts?.[0]

  async function handleAIImageGenerate() {
    if (!aiPrompt.trim() || aiImageLoading) return
    lastAiSettingsRef.current = { prompt: aiPrompt, model: aiModel, refImage: aiRefImage }
    const result = await generateAIImage({ prompt: aiPrompt, model: aiModel, image: aiRefImage?.dataURL, format: activePost?.format })
    if (result?.imageDataURL) {
      onAIImageGenerated?.(result.imageDataURL, result.textOverlays || [])
      setAiPrompt('')
      setAiRefImage(null)
      setActivePopover(null)
      setMobileTab(null)
    }
  }

  async function handleAIBatchGenerate() {
    if (!aiPrompt.trim() || aiImageLoading || !posts || posts.length < 2) return
    lastAiSettingsRef.current = { prompt: aiPrompt, model: aiModel, refImage: aiRefImage }
    await generateBatch({
      prompt: aiPrompt,
      model: aiModel,
      image: aiRefImage?.dataURL,
      posts: posts.map((p) => ({ format: p.format, postType: p.postType })),
      onEach: (index, result) => {
        if (result?.imageDataURL && posts[index]) {
          onAIImageForPost?.(posts[index].id, result.imageDataURL, result.textOverlays || [])
        }
      },
    })
    setAiPrompt('')
    setAiRefImage(null)
    setActivePopover(null)
    setMobileTab(null)
  }

  // Track which post is currently regenerating
  const [regeneratingPostId, setRegeneratingPostId] = useState(null)

  async function handleRegenerateForPost(post) {
    const settings = lastAiSettingsRef.current
    if (!settings?.prompt?.trim() || aiImageLoading) return
    setRegeneratingPostId(post.id)
    try {
      const result = await generateAIImage({
        prompt: settings.prompt,
        model: settings.model,
        image: settings.refImage?.dataURL,
        format: post.format,
      })
      if (result?.imageDataURL) {
        onAIImageForPost?.(post.id, result.imageDataURL, result.textOverlays || [])
      }
    } finally {
      setRegeneratingPostId(null)
    }
  }

  function handleAIFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (ev) => setAiRefImage({ name: file.name, dataURL: ev.target.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const isOverloadError = aiImageError && (aiImageError.includes('overloaded') || aiImageError.includes('temporarily') || aiImageError.includes('Rate limited'))

  function handleSwitchModel() {
    const other = AI_MODEL_OPTIONS.find((m) => m.value !== aiModel)
    if (other) {
      setAiModel(other.value)
      clearAIImageError()
    }
  }

  function handleTemplateSelect(id) {
    onTemplateChange(id)
    setActivePopover(null)
  }

  function handleUndo() {
    activeRef?.current?.undoLast()
  }

  function handleMobileTab(tab) {
    if (mobileTab === tab) {
      setMobileTab(null)
      return
    }
    setMobileTab(tab)
    // Activate corresponding tool mode
    if (tab === 'draw') onToolbarModeChange('draw')
  }

  // ── Current mode from active slot ────────────────────────────────────────
  const currentMode = activeState?.mode || 'move'

  // ── Canvas area content (shared between desktop + mobile) ─────────────────
  const FORMAT_RATIOS_MAP = { square: '1/1', portrait: '4/5', story: '9/16' }
  const FORMAT_LABELS = { square: t.formatSquare, portrait: t.formatPortrait, story: t.formatStory }
  const FORMAT_RATIO_DISPLAY = { square: '1:1', portrait: '4:5', story: '9:16' }

  function getMaxW(format) {
    return format === 'story' ? 340 : format === 'portrait' ? 420 : 480
  }

  function postHasImage(postId) {
    const postSlots = slotDataMap?.[postId]
    if (!postSlots) return false
    return Object.values(postSlots).some((s) => s?.rawDataURL)
  }

  function renderCanvasArea() {
    if (!posts || posts.length === 0) return null

    // Single post — same layout as before
    if (posts.length === 1) {
      const post = posts[0]
      const maxW = getMaxW(post.format)
      return (
        <div className="w-full" style={{ maxWidth: maxW }}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{FORMAT_RATIO_DISPLAY[post.format] || '1:1'}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{FORMAT_LABELS[post.format] || ''}</span>
          </div>
          <div
            className="relative rounded-xl flex flex-col gap-2 w-full overflow-hidden"
            onDragOver={onTemplateDragOver}
            onDragLeave={() => onSetDragOver(null)}
            onDrop={onTemplateDrop}
            onClick={onTemplateTap}
          >
            {renderTemplateForPost(post)}
          </div>
        </div>
      )
    }

    // Multiple posts — grid layout
    const gridCols = posts.length <= 2 ? 2 : posts.length <= 4 ? 2 : 3
    return (
      <div className="w-full max-w-[900px]">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}>
          {posts.map((post, idx) => {
            const isActive = post.id === activePostId
            return (
              <div
                key={post.id}
                onClick={() => onActivePostChange(post.id)}
                className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden
                  ${isActive
                    ? 'border-blue-500 shadow-md'
                    : 'border-stone-200 dark:border-[#2a2a2a] hover:border-stone-400 dark:hover:border-[#444] opacity-75 hover:opacity-100'}
                `}
              >
                {/* Post badge */}
                <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-stone-800/60 text-white'}
                `}>
                  {t.postBadge(idx + 1)}
                </div>
                {/* Format badge */}
                <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/40 text-white text-[9px] font-medium">
                  {FORMAT_RATIO_DISPLAY[post.format] || '1:1'}
                </div>
                {/* Template content */}
                <div
                  onDragOver={isActive ? onTemplateDragOver : undefined}
                  onDragLeave={isActive ? () => onSetDragOver(null) : undefined}
                  onDrop={isActive ? onTemplateDrop : undefined}
                >
                  {renderTemplateForPost(post)}
                </div>
                {/* Regenerate button — shows when post has an image and AI settings were used */}
                {lastAiSettingsRef.current && postHasImage(post.id) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRegenerateForPost(post) }}
                    disabled={aiImageLoading}
                    className="w-full py-1.5 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1
                      bg-stone-100 dark:bg-[#222] text-gray-500 dark:text-gray-400
                      hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {regeneratingPostId === post.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> {t.aiRegenerate || 'Regenerate'}</>
                      : <><RefreshCw className="w-3 h-3" /> {t.aiRegenerate || 'Regenerate'}</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
        {/* ── Icon sidebar ──────────────────────────────────────────────── */}
        <div className="w-16 flex-shrink-0 bg-white dark:bg-[#1a1a1a] border-e border-stone-200 dark:border-[#2a2a2a] flex flex-col items-center py-3 gap-0.5">
          <SidebarButton
            icon={<ImagePlus className="w-5 h-5" />}
            label={t.sidebarPhotos || 'Photos'}
            active={photoPanelOpen}
            onClick={togglePhotos}
          />

          <div className="w-8 h-px bg-stone-200 dark:bg-[#2a2a2a] my-1" />

          <SidebarButton
            icon={<Move className="w-5 h-5" />}
            label={t.toolbarMove}
            active={currentMode === 'move' && !photoPanelOpen}
            onClick={() => selectTool('move')}
          />
          {/* Draw — with settings popover */}
          <div className="relative" ref={drawRef}>
            <SidebarButton
              icon={<Pencil className="w-5 h-5" />}
              label={t.toolbarDraw}
              active={currentMode === 'draw' || activePopover === 'draw'}
              onClick={() => {
                if (currentMode !== 'draw') selectTool('draw')
                togglePopover('draw')
              }}
            />
            {activePopover === 'draw' && (
              <div className={`absolute top-0 ltr:left-full rtl:right-full ltr:ml-2 rtl:mr-2 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-lg shadow-lg p-3 min-w-[180px] z-30 ${popoverAnim}`}>
                {/* Line thickness */}
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">{t.drawThickness || 'Thickness'}</p>
                <div className="flex gap-1.5 mb-3">
                  {DRAW_LINE_WIDTHS.map((lw) => (
                    <button
                      key={lw.value}
                      onClick={() => onDrawSettingsChange({ ...drawSettings, lineWidth: lw.value })}
                      className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border
                        ${drawSettings.lineWidth === lw.value
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300'
                          : 'border-stone-200 dark:border-[#2a2a2a] text-gray-500 hover:border-stone-400'}
                      `}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="rounded-full bg-current" style={{ width: lw.value * 2, height: lw.value * 2 }} />
                        {lw.label}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Dotted / Solid */}
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">{t.drawStyle || 'Style'}</p>
                <div className="flex gap-1.5 mb-3">
                  <button
                    onClick={() => onDrawSettingsChange({ ...drawSettings, dashed: true })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border
                      ${drawSettings.dashed
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300'
                        : 'border-stone-200 dark:border-[#2a2a2a] text-gray-500 hover:border-stone-400'}
                    `}
                  >
                    <span className="inline-block w-8 border-t-2 border-dashed border-current align-middle" /> {t.drawDotted || 'Dotted'}
                  </button>
                  <button
                    onClick={() => onDrawSettingsChange({ ...drawSettings, dashed: false })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors border
                      ${!drawSettings.dashed
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300'
                        : 'border-stone-200 dark:border-[#2a2a2a] text-gray-500 hover:border-stone-400'}
                    `}
                  >
                    <span className="inline-block w-8 border-t-2 border-current align-middle" /> {t.drawSolid || 'Solid'}
                  </button>
                </div>

                {/* Color */}
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">{t.drawColor || 'Color'}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {DRAW_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onDrawSettingsChange({ ...drawSettings, color: c })}
                      className={`w-7 h-7 rounded-full border-2 transition-all
                        ${drawSettings.color === c ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a] hover:border-stone-500'}
                      `}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <SidebarButton
            icon={<Type className="w-5 h-5" />}
            label={t.toolbarText}
            active={currentMode === 'text'}
            onClick={() => selectTool(currentMode === 'text' ? 'move' : 'text')}
          />

          {/* AI Image — with popover */}
          <div className="relative" ref={aiImageRef}>
            <SidebarButton
              icon={<Sparkles className="w-5 h-5" />}
              label={t.toolbarAIImage || 'AI Image'}
              active={activePopover === 'aiImage'}
              onClick={() => { clearAIImageError(); togglePopover('aiImage') }}
            />
            {activePopover === 'aiImage' && (
              <div className={`absolute top-0 ltr:left-full rtl:right-full ltr:ml-2 rtl:mr-2 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-lg shadow-lg p-3 min-w-[260px] z-30 ${popoverAnim}`}>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">{t.toolbarAIImage || 'AI Image'}</p>
                {/* Model selector */}
                <div className="relative mb-2" ref={aiModelRef}>
                  <button
                    onClick={() => setAiModelOpen((p) => !p)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111] hover:bg-stone-100 dark:hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold ${activeAiModel.color}`}>{activeAiModel.label}</span>
                      <span className="text-[9px] text-gray-400">{activeAiModel.sub}</span>
                    </div>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${aiModelOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {aiModelOpen && (
                    <div className={`absolute top-full mt-1 left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-lg shadow-lg py-1 z-50 ${popoverAnim}`}>
                      {AI_MODEL_OPTIONS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => { setAiModel(m.value); setAiModelOpen(false) }}
                          className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors hover:bg-stone-50 dark:hover:bg-[#222]
                            ${aiModel === m.value ? 'bg-stone-50 dark:bg-[#222]' : ''}
                          `}
                        >
                          <span className={`text-[11px] font-bold ${m.color}`}>{m.label}</span>
                          <span className="text-[9px] text-gray-400">{m.sub}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t.aiImagePromptPlaceholder || 'Describe the image you want...'}
                  rows={3}
                  className="w-full rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111] text-sm text-gray-700 dark:text-gray-200 px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400"
                />
                {/* Reference image upload */}
                <input ref={aiFileRef} type="file" accept="image/*" className="hidden" onChange={handleAIFileSelect} />
                {aiRefImage ? (
                  <div className="flex items-center gap-2 mt-1.5 mb-1.5 p-1.5 rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111]">
                    <img src={aiRefImage.dataURL} alt="" className="w-10 h-10 rounded object-cover" />
                    <span className="text-[10px] text-gray-500 truncate flex-1">{aiRefImage.name}</span>
                    <button onClick={() => setAiRefImage(null)} className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-[#333] transition-colors">
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => aiFileRef.current?.click()}
                    className="w-full mt-1.5 mb-1.5 py-1.5 rounded-lg border border-dashed border-stone-300 dark:border-[#3a3a3a] text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-stone-400 dark:hover:border-[#555] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ImageUp className="w-3.5 h-3.5" /> {t.aiImageUpload || 'Upload reference image'}
                  </button>
                )}
                {aiImageError && (
                  <div className="mt-1 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-[10px] text-red-600 dark:text-red-400">{aiImageError}</p>
                    {isOverloadError && (
                      <button
                        onClick={handleSwitchModel}
                        className="mt-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {t.aiImageTryOtherModel || 'Try another model'}
                      </button>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-gray-400 mt-1 mb-2">{t.aiImagePrivacyNote}</p>
                {aiImageLoading ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-1.5">
                      <button
                        disabled
                        className="flex-1 py-2 rounded-lg text-xs font-semibold bg-blue-600/60 text-white flex items-center justify-center gap-1.5 cursor-wait"
                      >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {batchProgress
                          ? `${batchProgress.done}/${batchProgress.total} ${t.aiImageGenerating || 'Generating...'}`
                          : <>{t.aiImageGenerating || 'Generating...'} {aiElapsed > 0 && <span className="text-blue-200 tabular-nums">{aiElapsed}s</span>}</>
                        }
                      </button>
                      <button
                        onClick={cancelAIImage}
                        className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {batchProgress && (
                      <div className="w-full bg-stone-200 dark:bg-[#2a2a2a] rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={handleAIImageGenerate}
                      disabled={!aiPrompt.trim()}
                      className="w-full py-2 rounded-lg text-xs font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {t.aiImageGenerate || 'Generate'}
                    </button>
                    {posts && posts.length > 1 && (
                      <button
                        onClick={handleAIBatchGenerate}
                        disabled={!aiPrompt.trim()}
                        className="w-full py-2 rounded-lg text-xs font-semibold transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3" /> {(t.aiGenerateAll || 'Generate for All Posts') + ` (${posts.length})`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-8 h-px bg-stone-200 dark:bg-[#2a2a2a] my-1" />

          <SidebarButton
            icon={<Undo2 className="w-5 h-5" />}
            label={t.toolbarUndo}
            disabled={!(activeState?.strokes?.length > 0)}
            onClick={handleUndo}
          />

          {/* BG Color — with popover */}
          <div className="relative" ref={bgRef}>
            <SidebarButton
              icon={<Paintbrush className="w-5 h-5" />}
              label={t.toolbarBgColor}
              active={activePopover === 'bg'}
              onClick={() => togglePopover('bg')}
            />
            {activePopover === 'bg' && (
              <div className={`absolute top-0 ltr:left-full rtl:right-full ltr:ml-2 rtl:mr-2 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-lg shadow-lg p-2.5 z-30 ${popoverAnim}`}>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">{t.toolbarBgColor}</p>
                <div className="flex gap-2">
                  {BG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleBgSelect(opt.value)}
                      className={`w-8 h-8 rounded-md border-2 overflow-hidden transition-all
                        ${(activeState?.bgColor || 'white') === opt.value ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a] hover:border-stone-500'}
                      `}
                      title={t[opt.label]}
                    >
                      {opt.color ? (
                        <div className="w-full h-full" style={{ backgroundColor: opt.color }} />
                      ) : (
                        <CheckerPattern />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Template — with popover */}
          <div className="relative" ref={templateRef}>
            <SidebarButton
              icon={<LayoutTemplate className="w-5 h-5" />}
              label={t.toolbarTemplate}
              active={activePopover === 'template'}
              onClick={() => togglePopover('template')}
            />
            {activePopover === 'template' && (
              <div className={`absolute top-0 ltr:left-full rtl:right-full ltr:ml-2 rtl:mr-2 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-lg shadow-lg py-1.5 min-w-[170px] z-30 ${popoverAnim}`}>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1 px-3">{t.toolbarTemplate}</p>
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleTemplateSelect(opt.id)}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2
                      ${selectedTemplate === opt.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200 hover:bg-stone-100 dark:hover:bg-[#222]'}
                    `}
                  >
                    <span className="font-medium">{t[opt.labelKey]}</span>
                    <span className="text-gray-400 text-[10px]">{t[opt.descKey]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-8 h-px bg-stone-200 dark:bg-[#2a2a2a] my-1" />

          <SidebarButton
            icon={<ZoomIn className="w-5 h-5" />}
            label={t.toolbarZoomIn}
            active={currentMode === 'zoomIn'}
            disabled={(activeState?.scale || 1) >= 5.0}
            onClick={() => selectTool(currentMode === 'zoomIn' ? 'move' : 'zoomIn')}
          />
          <SidebarButton
            icon={<ZoomOut className="w-5 h-5" />}
            label={t.toolbarZoomOut}
            active={currentMode === 'zoomOut'}
            disabled={(activeState?.scale || 1) <= 1.0}
            onClick={() => selectTool(currentMode === 'zoomOut' ? 'move' : 'zoomOut')}
          />
        </div>

        {/* ── Photo panel (toggleable, animated) ────────────────────────── */}
        <div
          className="flex-shrink-0 self-stretch min-h-0 bg-white dark:bg-[#1a1a1a] border-e border-stone-200 dark:border-[#2a2a2a] overflow-hidden transition-[width] duration-200 ease-in-out"
          style={{ width: photoPanelOpen ? 256 : 0 }}
        >
          <div className="w-64 h-full overflow-hidden">
            <PhotoPanel
              images={images}
              slotData={flatSlotData}
              selectedImageId={selectedImageId}
              bulkDragging={bulkDragging}
              inputRef={inputRef}
              onBulkDrop={onBulkDrop}
              onBulkDragOver={() => setBulkDragging(true)}
              onBulkDragLeave={() => setBulkDragging(false)}
              onFileInput={onFileInput}
              onGalleryDragStart={onGalleryDragStart}
              onGalleryTap={onGalleryTap}
              onRemoveImage={onRemoveImage}
              setBulkDragging={setBulkDragging}
            />
          </div>
        </div>

        {/* ── Canvas area ───────────────────────────────────────────────── */}
        <div className="flex-1 bg-stone-100 dark:bg-[#111] flex flex-col items-center justify-center p-6 overflow-auto">
          {renderCanvasArea()}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MOBILE LAYOUT — Canva-style                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden flex-1 min-h-0 flex flex-col">
        {/* Canvas area — fills everything above the nav, content centered */}
        <div className="flex-1 min-h-0 bg-stone-100 dark:bg-[#111] flex flex-col items-center justify-center p-4 overflow-auto relative">
          {renderCanvasArea()}

          {/* Overlay panels — float on top of canvas, anchored to bottom of canvas area */}
          {mobileTab && mobileTab !== 'uploads' && (
            <div className="absolute bottom-0 left-0 right-0 z-30">
              {/* Draw settings */}
              {mobileTab === 'draw' && currentMode === 'draw' && (
                <div className="bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-stone-200 dark:border-[#2a2a2a] px-4 py-3 rounded-t-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider w-14 flex-shrink-0">{t.drawThickness || 'Thickness'}</span>
                    <div className="flex gap-1.5 flex-1">
                      {DRAW_LINE_WIDTHS.map((lw) => (
                        <button
                          key={lw.value}
                          onClick={() => onDrawSettingsChange?.({ ...drawSettings, lineWidth: lw.value })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors border
                            ${drawSettings.lineWidth === lw.value
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300'
                              : 'border-stone-200 dark:border-[#2a2a2a] text-gray-500'}`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <div className="rounded-full bg-current" style={{ width: lw.value * 2, height: lw.value * 2 }} />
                            {lw.label}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onDrawSettingsChange?.({ ...drawSettings, dashed: true })}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors border
                          ${drawSettings.dashed ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300' : 'border-stone-200 dark:border-[#2a2a2a] text-gray-500'}`}
                      >
                        <span className="inline-block w-5 border-t-2 border-dashed border-current align-middle" />
                      </button>
                      <button
                        onClick={() => onDrawSettingsChange?.({ ...drawSettings, dashed: false })}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors border
                          ${!drawSettings.dashed ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-300' : 'border-stone-200 dark:border-[#2a2a2a] text-gray-500'}`}
                      >
                        <span className="inline-block w-5 border-t-2 border-current align-middle" />
                      </button>
                    </div>
                    <div className="h-5 w-px bg-stone-200 dark:bg-[#2a2a2a]" />
                    <div className="flex gap-1.5">
                      {DRAW_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => onDrawSettingsChange?.({ ...drawSettings, color: c })}
                          className={`w-6 h-6 rounded-full border-2 transition-all
                            ${drawSettings.color === c ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Image */}
              {mobileTab === 'aiImage' && (
                <div className="bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-stone-200 dark:border-[#2a2a2a] px-4 py-3 rounded-t-2xl">
                  {/* Model selector */}
                  <div className="relative mb-2" ref={aiModelRef}>
                    <button
                      onClick={() => setAiModelOpen((p) => !p)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111] hover:bg-stone-100 dark:hover:bg-[#1a1a1a] transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold ${activeAiModel.color}`}>{activeAiModel.label}</span>
                        <span className="text-[9px] text-gray-400">{activeAiModel.sub}</span>
                      </div>
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${aiModelOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {aiModelOpen && (
                      <div className={`absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-lg shadow-lg py-1 z-50 ${popoverAnim}`}>
                        {AI_MODEL_OPTIONS.map((m) => (
                          <button
                            key={m.value}
                            onClick={() => { setAiModel(m.value); setAiModelOpen(false) }}
                            className={`w-full px-3 py-1.5 flex items-center gap-2 text-left transition-colors hover:bg-stone-50 dark:hover:bg-[#222]
                              ${aiModel === m.value ? 'bg-stone-50 dark:bg-[#222]' : ''}
                            `}
                          >
                            <span className={`text-[11px] font-bold ${m.color}`}>{m.label}</span>
                            <span className="text-[9px] text-gray-400">{m.sub}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={t.aiImagePromptPlaceholder || 'Describe the image you want...'}
                    rows={2}
                    className="w-full rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111] text-sm text-gray-700 dark:text-gray-200 px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-400"
                  />
                  {/* Reference image upload */}
                  {aiRefImage ? (
                    <div className="flex items-center gap-2 mt-1.5 mb-1.5 p-1.5 rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111]">
                      <img src={aiRefImage.dataURL} alt="" className="w-10 h-10 rounded object-cover" />
                      <span className="text-[10px] text-gray-500 truncate flex-1">{aiRefImage.name}</span>
                      <button onClick={() => setAiRefImage(null)} className="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-[#333] transition-colors">
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => aiFileRef.current?.click()}
                      className="w-full mt-1.5 mb-1.5 py-1.5 rounded-lg border border-dashed border-stone-300 dark:border-[#3a3a3a] text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-stone-400 dark:hover:border-[#555] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ImageUp className="w-3.5 h-3.5" /> {t.aiImageUpload || 'Upload reference image'}
                    </button>
                  )}
                  {aiImageError && (
                    <p className="text-[10px] text-red-500 mt-1">{aiImageError}</p>
                  )}
                  <p className="text-[9px] text-gray-400 mt-1 mb-2">{t.aiImagePrivacyNote}</p>
                  {aiImageLoading ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        <button
                          disabled
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600/60 text-white flex items-center justify-center gap-1.5 cursor-wait"
                        >
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {batchProgress
                            ? `${batchProgress.done}/${batchProgress.total} ${t.aiImageGenerating || 'Generating...'}`
                            : <>{t.aiImageGenerating || 'Generating...'} {aiElapsed > 0 && <span className="text-blue-200 tabular-nums">{aiElapsed}s</span>}</>
                          }
                        </button>
                        <button
                          onClick={cancelAIImage}
                          className="px-3 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {batchProgress && (
                        <div className="w-full bg-stone-200 dark:bg-[#2a2a2a] rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={handleAIImageGenerate}
                        disabled={!aiPrompt.trim()}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {t.aiImageGenerate || 'Generate'}
                      </button>
                      {posts && posts.length > 1 && (
                        <button
                          onClick={handleAIBatchGenerate}
                          disabled={!aiPrompt.trim()}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> {(t.aiGenerateAll || 'Generate for All Posts') + ` (${posts.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* BG color */}
              {mobileTab === 'bg' && (
                <div className="bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-stone-200 dark:border-[#2a2a2a] px-4 py-3 rounded-t-2xl">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">{t.toolbarBgColor}</p>
                  <div className="flex gap-2">
                    {BG_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { handleBgSelect(opt.value); setMobileTab(null) }}
                        className={`w-10 h-10 rounded-xl border-2 overflow-hidden transition-all
                          ${(activeState?.bgColor || 'white') === opt.value ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}`}
                        title={t[opt.label]}
                      >
                        {opt.color ? (
                          <div className="w-full h-full" style={{ backgroundColor: opt.color }} />
                        ) : (
                          <CheckerPattern />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Template */}
              {mobileTab === 'template' && (
                <div className="bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-stone-200 dark:border-[#2a2a2a] px-4 py-3 rounded-t-2xl">
                  <div className="flex gap-2">
                    {TEMPLATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { handleTemplateSelect(opt.id); setMobileTab(null) }}
                        className={`flex-1 py-2.5 rounded-xl border text-center transition-colors
                          ${selectedTemplate === opt.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 text-blue-700 dark:text-blue-400'
                            : 'border-stone-200 dark:border-[#2a2a2a] text-gray-700 dark:text-gray-200 hover:bg-stone-50 dark:hover:bg-[#222]'}`}
                      >
                        <span className="text-sm font-medium block">{t[opt.labelKey]}</span>
                        <span className="text-[10px] text-gray-400">{t[opt.descKey]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Uploads overlay panel */}
          {mobileTab === 'uploads' && (
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-stone-200 dark:border-[#2a2a2a] max-h-[50%] overflow-y-auto rounded-t-2xl">
              <div className="p-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="w-full py-3 mb-3 rounded-xl border-2 border-dashed border-stone-300 dark:border-[#3a3a3a] flex items-center justify-center gap-2 text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">{t.dropZoneSub}</span>
                </button>
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img) => {
                      const inSlot = Object.values(flatSlotData).some((s) => s?.rawId === img.id)
                      const isSel = selectedImageId === img.id
                      return (
                        <div
                          key={img.id}
                          onClick={() => !inSlot && onGalleryTap(img.id)}
                          draggable
                          onDragStart={(e) => onGalleryDragStart(e, img.id)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                            ${inSlot ? 'border-blue-500 opacity-50' : ''}
                            ${!inSlot && isSel ? 'border-blue-500 ring-2 ring-blue-400' : ''}
                            ${!inSlot && !isSel ? 'border-stone-200 dark:border-[#2a2a2a]' : ''}
                          `}
                        >
                          <img src={img.dataURL} alt={img.name} className="w-full h-full object-cover" />
                          {inSlot && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">{t.placed}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveImage(img.id) }}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full text-white text-[10px] flex items-center justify-center"
                          >×</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileInput} />

        {/* ── Bottom nav bar — always at bottom, scrolls horizontally ── */}
        <div className="flex-shrink-0 bg-white dark:bg-[#1a1a1a] border-t border-stone-200 dark:border-[#2a2a2a] rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.06)] relative">
          {/* Fade hints showing more tools are available */}
          <div className="pointer-events-none absolute inset-y-0 ltr:right-0 rtl:left-0 w-8 z-10 bg-gradient-to-l ltr:bg-gradient-to-l rtl:bg-gradient-to-r from-white dark:from-[#1a1a1a] to-transparent rounded-tr-2xl transition-opacity" id="mobileNavFadeEnd" />
          <div className="pointer-events-none absolute inset-y-0 ltr:left-0 rtl:right-0 w-8 z-10 bg-gradient-to-r ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-white dark:from-[#1a1a1a] to-transparent rounded-tl-2xl opacity-0 transition-opacity" id="mobileNavFadeStart" />

          <div
            className="flex overflow-x-auto no-scrollbar px-2 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onScroll={(e) => {
              const el = e.currentTarget
              const fadeStart = el.parentElement?.querySelector('#mobileNavFadeStart')
              const fadeEnd = el.parentElement?.querySelector('#mobileNavFadeEnd')
              if (fadeStart) fadeStart.style.opacity = el.scrollLeft > 8 ? '1' : '0'
              if (fadeEnd) fadeEnd.style.opacity = (el.scrollWidth - el.scrollLeft - el.clientWidth) > 8 ? '1' : '0'
            }}
            ref={(el) => {
              if (!el) return
              const fadeEnd = el.parentElement?.querySelector('#mobileNavFadeEnd')
              if (fadeEnd) fadeEnd.style.opacity = (el.scrollWidth - el.clientWidth) > 8 ? '1' : '0'
            }}
          >
            <MobileNavBtn
              icon={<LayoutTemplate className="w-6 h-6" />}
              label={t.toolbarTemplate}
              active={mobileTab === 'template'}
              onClick={() => handleMobileTab('template')}
            />
            <MobileNavBtn
              icon={<Move className="w-6 h-6" />}
              label={t.toolbarMove}
              active={currentMode === 'move' && !mobileTab}
              onClick={() => { selectTool('move'); setMobileTab(null) }}
            />
            <MobileNavBtn
              icon={<Pencil className="w-6 h-6" />}
              label={t.toolbarDraw}
              active={currentMode === 'draw' || mobileTab === 'draw'}
              onClick={() => handleMobileTab('draw')}
            />
            <MobileNavBtn
              icon={<Type className="w-6 h-6" />}
              label={t.toolbarText}
              active={currentMode === 'text'}
              onClick={() => { selectTool(currentMode === 'text' ? 'move' : 'text'); setMobileTab(null) }}
            />
            <MobileNavBtn
              icon={<Sparkles className="w-6 h-6" />}
              label={t.toolbarAIImage || 'AI Image'}
              active={mobileTab === 'aiImage'}
              onClick={() => { clearAIImageError(); handleMobileTab('aiImage') }}
            />
            <MobileNavBtn
              icon={<Undo2 className="w-6 h-6" />}
              label={t.toolbarUndo}
              disabled={!(activeState?.strokes?.length > 0)}
              onClick={handleUndo}
            />
            <MobileNavBtn
              icon={<Paintbrush className="w-6 h-6" />}
              label={t.toolbarBgColor}
              active={mobileTab === 'bg'}
              onClick={() => handleMobileTab('bg')}
            />
            <MobileNavBtn
              icon={<ZoomIn className="w-6 h-6" />}
              label={t.toolbarZoomIn}
              active={currentMode === 'zoomIn'}
              disabled={(activeState?.scale || 1) >= 5.0}
              onClick={() => { selectTool(currentMode === 'zoomIn' ? 'move' : 'zoomIn'); setMobileTab(null) }}
            />
            <MobileNavBtn
              icon={<ZoomOut className="w-6 h-6" />}
              label={t.toolbarZoomOut}
              active={currentMode === 'zoomOut'}
              disabled={(activeState?.scale || 1) <= 1.0}
              onClick={() => { selectTool(currentMode === 'zoomOut' ? 'move' : 'zoomOut'); setMobileTab(null) }}
            />
            <MobileNavBtn
              icon={<ImagePlus className="w-6 h-6" />}
              label={t.sidebarPhotos || 'Photos'}
              active={mobileTab === 'uploads'}
              onClick={() => handleMobileTab('uploads')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
