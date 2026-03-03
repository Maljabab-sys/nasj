import { useState, useRef, useEffect } from 'react'
import { Move, Pencil, Type, Zap, Undo2, ZoomIn, ZoomOut, Paintbrush, LayoutTemplate, Upload, ImagePlus } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import { DEFAULT_DOCTOR_NAME } from '../../constants/layout'
import { DRAW_COLORS, DRAW_LINE_WIDTHS, DASH_PATTERN } from '../../constants/annotation'
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
  images, slotData, selectedImageId, selectedTemplate,
  watermarkText, format, bulkDragging,
  dragOver, lang,
  // Active slot
  effectiveActiveSlot, activeState, activeRef,
  // Refs
  inputRef, beforeSlotRef, afterSlotRef, singleSlotRef,
  // Callbacks
  onFileInput, onBulkDrop, setBulkDragging,
  onRemoveImage, onGalleryDragStart, onGalleryTap,
  onTemplateTap, onTemplateDrop, onTemplateDragOver, onSetDragOver,
  onToolbarModeChange, onToolbarBgChange, drawSettings, onDrawSettingsChange, onTemplateChange, onWatermarkChange,
  // Render
  renderTemplate, fmtStyle, templateRatio,
}) {
  const { t } = useLanguage()
  const [photoPanelOpen, setPhotoPanelOpen] = useState(true)
  const [activePopover, setActivePopover] = useState(null) // null | 'ai' | 'bg' | 'template' | 'draw'
  const [mobileTab, setMobileTab] = useState(null) // null | 'uploads' | 'draw' | 'ai' | 'bg' | 'template'

  // Refs for outside-click detection
  const aiRef = useRef(null)
  const bgRef = useRef(null)
  const templateRef = useRef(null)
  const drawRef = useRef(null)

  // Close popover on outside click
  useEffect(() => {
    if (!activePopover) return
    function handleClick(e) {
      const refMap = { ai: aiRef, bg: bgRef, template: templateRef, draw: drawRef }
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
  }

  function handleAutoArch(type) {
    activeRef?.current?.addArchStroke(type)
    setActivePopover(null)
  }

  function handleBgSelect(bg) {
    onToolbarBgChange(bg)
    setActivePopover(null)
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

  // ── Template max-width based on format ───────────────────────────────────
  const templateMaxW = format === 'story' ? 340 : format === 'portrait' ? 420 : 480

  // ── Canvas area content (shared between desktop + mobile) ─────────────────
  function renderCanvasArea() {
    return (
      <div className="w-full" style={{ maxWidth: templateMaxW }}>
        {/* Format label */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{fmtStyle.ratio}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {format === 'square' ? t.formatSquare : format === 'portrait' ? t.formatPortrait : t.formatStory}
          </span>
        </div>
        {/* Template container */}
        <div
          className="relative rounded-xl flex flex-col gap-2 w-full overflow-hidden"
          onDragOver={onTemplateDragOver}
          onDragLeave={() => onSetDragOver(null)}
          onDrop={onTemplateDrop}
          onClick={onTemplateTap}
        >
          {renderTemplate()}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DESKTOP LAYOUT                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-1 min-h-0">
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

          {/* AI Line — with popover */}
          <div className="relative" ref={aiRef}>
            <SidebarButton
              icon={<Zap className="w-5 h-5" />}
              label={t.toolbarAI}
              active={activePopover === 'ai'}
              onClick={() => togglePopover('ai')}
            />
            {activePopover === 'ai' && (
              <div className={`absolute top-0 ltr:left-full rtl:right-full ltr:ml-2 rtl:mr-2 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-lg shadow-lg py-1 min-w-[160px] z-30 ${popoverAnim}`}>
                <button
                  onClick={() => handleAutoArch('incisal')}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-stone-100 dark:hover:bg-[#222] transition-colors"
                >
                  {t.toolbarIncisalArch || t.toolIncisalArch}
                </button>
                <button
                  onClick={() => handleAutoArch('arch_upper')}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-stone-100 dark:hover:bg-[#222] transition-colors"
                >
                  {t.toolbarFullArch || t.toolFullArch}
                </button>
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
          className="flex-shrink-0 bg-white dark:bg-[#1a1a1a] border-e border-stone-200 dark:border-[#2a2a2a] overflow-hidden transition-[width] duration-200 ease-in-out"
          style={{ width: photoPanelOpen ? 256 : 0 }}
        >
          <div className="w-64">
            <PhotoPanel
              images={images}
              slotData={slotData}
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

              {/* AI arch */}
              {mobileTab === 'ai' && (
                <div className="bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm border-t border-stone-200 dark:border-[#2a2a2a] px-4 py-3 rounded-t-2xl">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { activeRef?.current?.addArchStroke('incisal'); setMobileTab(null) }}
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-[#2a2a2a] text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-stone-50 dark:hover:bg-[#222] transition-colors"
                    >
                      {t.toolbarIncisalArch || t.toolIncisalArch}
                    </button>
                    <button
                      onClick={() => { activeRef?.current?.addArchStroke('arch_upper'); setMobileTab(null) }}
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-[#2a2a2a] text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-stone-50 dark:hover:bg-[#222] transition-colors"
                    >
                      {t.toolbarFullArch || t.toolFullArch}
                    </button>
                  </div>
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
                      const inSlot = Object.values(slotData).some((s) => s?.rawId === img.id)
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
              icon={<Zap className="w-6 h-6" />}
              label={t.toolbarAI}
              active={mobileTab === 'ai'}
              onClick={() => handleMobileTab('ai')}
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
