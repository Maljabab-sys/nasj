import { useState, useRef, useEffect } from 'react'
import { Move, Pencil, Zap, Undo2, ZoomIn, ZoomOut, Paintbrush, Type, LayoutTemplate } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'
import { DRAW_COLORS, DRAW_LINE_WIDTHS } from '../../constants/annotation'

function ToolBtn({ active, disabled, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/15 active:bg-white/25'}
        ${active ? 'bg-white/25' : ''}
      `}
    >
      {children}
    </button>
  )
}

const BG_OPTIONS = [
  { value: 'black', color: '#0a0a0a', border: 'border-white/30' },
  { value: 'white', color: '#ffffff', border: 'border-white/30' },
  { value: 'transparent', color: null, border: 'border-white/30' },
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

export default function InlineToolbar({ mode, onModeChange, onAutoArch, onUndo, hasStrokes, onZoomIn, onZoomOut, scale, bgColor, onBgColorChange, selectedTemplate, onTemplateChange, drawSettings, onDrawSettingsChange }) {
  const { t } = useLanguage()
  const [showAI, setShowAI] = useState(false)
  const [showBg, setShowBg] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [showDraw, setShowDraw] = useState(false)
  const aiRef = useRef(null)
  const bgRef = useRef(null)
  const templateRef = useRef(null)
  const drawPopRef = useRef(null)

  // Close AI popover on outside click
  useEffect(() => {
    if (!showAI) return
    function handleClick(e) {
      if (aiRef.current && !aiRef.current.contains(e.target)) setShowAI(false)
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [showAI])

  // Close BG popover on outside click
  useEffect(() => {
    if (!showBg) return
    function handleClick(e) {
      if (bgRef.current && !bgRef.current.contains(e.target)) setShowBg(false)
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [showBg])

  // Close template popover on outside click
  useEffect(() => {
    if (!showTemplate) return
    function handleClick(e) {
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplate(false)
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [showTemplate])

  // Close draw popover on outside click
  useEffect(() => {
    if (!showDraw) return
    function handleClick(e) {
      if (drawPopRef.current && !drawPopRef.current.contains(e.target)) setShowDraw(false)
    }
    document.addEventListener('pointerdown', handleClick)
    return () => document.removeEventListener('pointerdown', handleClick)
  }, [showDraw])

  const templateOptions = [
    { id: 'classic', label: t.templateClassic, desc: t.templateClassicDesc },
    { id: 'clean', label: t.templateClean, desc: t.templateCleanDesc },
    { id: 'elegant', label: t.templateElegant, desc: t.templateElegantDesc },
  ]

  return (
    <div className="flex flex-row md:flex-col items-center gap-0.5 bg-black/60 backdrop-blur-sm rounded-lg py-1 px-1.5 md:px-1 md:py-1.5">
      <ToolBtn active={mode === 'move'} onClick={() => onModeChange('move')} title={t.toolbarMove}>
        <Move className="w-4 h-4 text-white" />
      </ToolBtn>

      {/* Draw — with settings popover */}
      <div className="relative" ref={drawPopRef}>
        <ToolBtn active={mode === 'draw'} onClick={() => { if (mode !== 'draw') onModeChange('draw'); setShowDraw(!showDraw) }} title={t.toolbarDraw}>
          <Pencil className="w-4 h-4 text-white" />
        </ToolBtn>
        {showDraw && drawSettings && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 md:bottom-auto md:top-0 md:left-auto md:translate-x-0 md:right-full md:mb-0 md:mr-1 bg-black/80 backdrop-blur-sm rounded-lg p-2.5 min-w-[170px] shadow-xl z-20">
            <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider mb-1.5">{t.drawThickness || 'Thickness'}</p>
            <div className="flex gap-1 mb-2">
              {DRAW_LINE_WIDTHS.map((lw) => (
                <button
                  key={lw.value}
                  onClick={() => onDrawSettingsChange?.({ ...drawSettings, lineWidth: lw.value })}
                  className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-colors
                    ${drawSettings.lineWidth === lw.value ? 'bg-blue-500/30 text-blue-300' : 'text-white hover:bg-white/15'}
                  `}
                >
                  <div className="flex items-center justify-center gap-1">
                    <div className="rounded-full bg-current" style={{ width: lw.value * 2, height: lw.value * 2 }} />
                    {lw.label}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider mb-1.5">{t.drawStyle || 'Style'}</p>
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => onDrawSettingsChange?.({ ...drawSettings, dashed: true })}
                className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-colors ${drawSettings.dashed ? 'bg-blue-500/30 text-blue-300' : 'text-white hover:bg-white/15'}`}
              >
                <span className="inline-block w-6 border-t border-dashed border-current align-middle" /> {t.drawDotted || 'Dotted'}
              </button>
              <button
                onClick={() => onDrawSettingsChange?.({ ...drawSettings, dashed: false })}
                className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-colors ${!drawSettings.dashed ? 'bg-blue-500/30 text-blue-300' : 'text-white hover:bg-white/15'}`}
              >
                <span className="inline-block w-6 border-t border-current align-middle" /> {t.drawSolid || 'Solid'}
              </button>
            </div>
            <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider mb-1.5">{t.drawColor || 'Color'}</p>
            <div className="flex gap-1.5 flex-wrap">
              {DRAW_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onDrawSettingsChange?.({ ...drawSettings, color: c })}
                  className={`w-6 h-6 rounded-full border-2 transition-all
                    ${drawSettings.color === c ? 'border-blue-400 scale-110' : 'border-white/30 hover:border-white/60'}
                  `}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ToolBtn active={mode === 'text'} onClick={() => onModeChange(mode === 'text' ? 'move' : 'text')} title={t.toolbarText}>
        <Type className="w-4 h-4 text-white" />
      </ToolBtn>

      {/* AI auto-arch button with popover */}
      <div className="relative" ref={aiRef}>
        <ToolBtn onClick={() => setShowAI(!showAI)} title={t.toolbarAI}>
          <Zap className="w-4 h-4 text-white" />
        </ToolBtn>

        {showAI && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 md:bottom-auto md:top-0 md:left-auto md:translate-x-0 md:right-full md:mb-0 md:mr-1 bg-black/80 backdrop-blur-sm rounded-lg py-1 min-w-[140px] shadow-xl z-20">
            <button
              onClick={() => { onAutoArch('incisal'); setShowAI(false) }}
              className="w-full px-3 py-1.5 text-left text-xs text-white hover:bg-white/15 transition-colors"
            >
              {t.toolbarIncisalArch || t.toolIncisalArch}
            </button>
            <button
              onClick={() => { onAutoArch('arch_upper'); setShowAI(false) }}
              className="w-full px-3 py-1.5 text-left text-xs text-white hover:bg-white/15 transition-colors"
            >
              {t.toolbarFullArch || t.toolFullArch}
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-5 md:h-px md:w-5 bg-white/20 mx-0.5 md:mx-0 md:my-0.5" />

      <ToolBtn onClick={onUndo} disabled={!hasStrokes} title={t.toolbarUndo}>
        <Undo2 className="w-4 h-4 text-white" />
      </ToolBtn>

      <div className="w-px h-5 md:h-px md:w-5 bg-white/20 mx-0.5 md:mx-0 md:my-0.5" />

      {/* Background color button with popover */}
      <div className="relative" ref={bgRef}>
        <ToolBtn onClick={() => setShowBg(!showBg)} title={t.toolbarBgColor}>
          <Paintbrush className="w-4 h-4 text-white" />
        </ToolBtn>

        {showBg && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 md:bottom-auto md:top-0 md:left-auto md:translate-x-0 md:right-full md:mb-0 md:mr-1 bg-black/80 backdrop-blur-sm rounded-lg p-2 shadow-xl z-20">
            <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider mb-1.5 px-0.5">{t.toolbarBgColor}</p>
            <div className="flex gap-1.5">
              {BG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onBgColorChange(opt.value); setShowBg(false) }}
                  className={`w-7 h-7 rounded-md border-2 overflow-hidden transition-all
                    ${bgColor === opt.value ? 'border-blue-400 scale-110' : opt.border + ' hover:border-white/60'}
                  `}
                  title={opt.value === 'black' ? t.bgBlack : opt.value === 'white' ? t.bgWhite : t.bgTransparent}
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

      {/* Template picker with popover */}
      <div className="relative" ref={templateRef}>
        <ToolBtn onClick={() => setShowTemplate(!showTemplate)} title={t.toolbarTemplate}>
          <LayoutTemplate className="w-4 h-4 text-white" />
        </ToolBtn>

        {showTemplate && (
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 md:bottom-auto md:top-0 md:left-auto md:translate-x-0 md:right-full md:mb-0 md:mr-1 bg-black/80 backdrop-blur-sm rounded-lg py-1.5 min-w-[150px] shadow-xl z-20">
            <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider mb-1 px-3">{t.toolbarTemplate}</p>
            {templateOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => { onTemplateChange(opt.id); setShowTemplate(false) }}
                className={`w-full px-3 py-1.5 text-left text-xs transition-colors flex items-center gap-2
                  ${selectedTemplate === opt.id ? 'bg-blue-500/30 text-blue-300' : 'text-white hover:bg-white/15'}
                `}
              >
                <span className="font-medium">{opt.label}</span>
                <span className="text-white/40 text-[10px]">{opt.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 md:h-px md:w-5 bg-white/20 mx-0.5 md:mx-0 md:my-0.5" />

      <ToolBtn active={mode === 'zoomIn'} onClick={() => onModeChange(mode === 'zoomIn' ? 'move' : 'zoomIn')} disabled={scale >= 5.0} title={t.toolbarZoomIn}>
        <ZoomIn className="w-4 h-4 text-white" />
      </ToolBtn>

      <ToolBtn active={mode === 'zoomOut'} onClick={() => onModeChange(mode === 'zoomOut' ? 'move' : 'zoomOut')} disabled={scale <= 1.0} title={t.toolbarZoomOut}>
        <ZoomOut className="w-4 h-4 text-white" />
      </ToolBtn>
    </div>
  )
}
