import { useLanguage } from '../../i18n/LanguageContext'
import {
  TEXT_FONTS, TEXT_COLORS, TEXT_BG_COLORS,
  TEXT_DEFAULT_SIZE, TEXT_SIZE_MIN, TEXT_SIZE_MAX,
  TEXT_ALIGNS, TEXT_DIRECTIONS, TEXT_BG_SHAPES,
} from '../../constants/annotation'

export default function TextStyleToolbar({
  position, font, color, bgColor, fontSize,
  textAlign, direction, bgShape,
  onFontChange, onColorChange, onBgColorChange,
  onTextAlignChange, onDirectionChange, onBgShapeChange,
  onClose,
}) {
  const { t } = useLanguage()

  // Position using fixed viewport coordinates — horizontal bar above/below text
  const barHeight = 48
  const showBelow = position.vy < barHeight + 20
  const style = {
    position: 'fixed',
    left: `${position.vx}px`,
    top: showBelow ? `${position.vy + 16}px` : `${position.vy - 16}px`,
    transform: showBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)',
    zIndex: 9999,
  }

  const divider = <div className="w-px h-6 bg-stone-200 dark:bg-[#2a2a2a] flex-shrink-0" />

  const alignIcons = {
    left: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="1" y="6" width="10" height="1.5" rx=".5" />
        <rect x="1" y="10" width="12" height="1.5" rx=".5" />
        <rect x="1" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
    center: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="3" y="6" width="10" height="1.5" rx=".5" />
        <rect x="2" y="10" width="12" height="1.5" rx=".5" />
        <rect x="4" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
    right: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1" y="2" width="14" height="1.5" rx=".5" />
        <rect x="5" y="6" width="10" height="1.5" rx=".5" />
        <rect x="3" y="10" width="12" height="1.5" rx=".5" />
        <rect x="7" y="14" width="8" height="1.5" rx=".5" />
      </svg>
    ),
  }

  return (
    <div
      style={style}
      className="bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#3a3a3a] rounded-xl shadow-2xl px-3 py-2 flex items-center gap-2 flex-wrap max-w-[95vw]"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Font selector */}
      <select
        value={font}
        onChange={(e) => onFontChange(e.target.value)}
        className="px-1.5 py-1 rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111] text-gray-900 dark:text-white text-xs focus:outline-none max-w-[90px]"
      >
        {TEXT_FONTS.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
        ))}
      </select>

      {divider}

      {/* Text color swatches */}
      <div className="flex items-center gap-1">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0
              ${color === c ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}
            `}
            style={{ backgroundColor: c }}
            title={t.textColor}
          />
        ))}
        <div className="relative">
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer"
          />
          <div
            className={`w-5 h-5 rounded-full border-2 transition-all overflow-hidden flex-shrink-0
              ${!TEXT_COLORS.includes(color) ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}
            `}
            style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
          />
        </div>
      </div>

      {divider}

      {/* Background color swatches */}
      <div className="flex items-center gap-1">
        {TEXT_BG_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onBgColorChange(c)}
            className={`w-5 h-5 rounded-full border-2 transition-all overflow-hidden flex-shrink-0
              ${bgColor === c ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}
            `}
            title={t.textBgColor}
          >
            {c === 'transparent' ? (
              <svg className="w-full h-full" viewBox="0 0 16 16">
                <rect width="8" height="8" fill="#ccc" />
                <rect x="8" y="8" width="8" height="8" fill="#ccc" />
                <rect x="8" width="8" height="8" fill="#fff" />
                <rect y="8" width="8" height="8" fill="#fff" />
              </svg>
            ) : (
              <div className="w-full h-full" style={{ backgroundColor: c }} />
            )}
          </button>
        ))}
        <div className="relative">
          <input
            type="color"
            value={bgColor === 'transparent' ? '#1a3a6b' : bgColor}
            onChange={(e) => onBgColorChange(e.target.value)}
            className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer"
          />
          <div
            className={`w-5 h-5 rounded-full border-2 transition-all overflow-hidden flex-shrink-0
              ${bgColor !== 'transparent' && !TEXT_BG_COLORS.includes(bgColor) ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}
            `}
            style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
          />
        </div>
      </div>

      {divider}

      {/* Background shape — rounded / square */}
      <div className="flex items-center gap-1">
        {TEXT_BG_SHAPES.map((s) => (
          <button
            key={s}
            onClick={() => onBgShapeChange(s)}
            className={`w-6 h-6 border-2 transition-all flex items-center justify-center flex-shrink-0
              ${s === 'rounded' ? 'rounded-md' : 'rounded-none'}
              ${bgShape === s ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'border-stone-300 dark:border-[#3a3a3a]'}
            `}
            title={s === 'rounded' ? (t.bgShapeRounded || 'Rounded') : (t.bgShapeSquare || 'Square')}
          >
            <div className={`w-3 h-2 bg-current opacity-40 ${s === 'rounded' ? 'rounded-sm' : ''}`} />
          </button>
        ))}
      </div>

      {divider}

      {/* Text alignment — left / center / right */}
      <div className="flex items-center gap-0.5">
        {TEXT_ALIGNS.map((a) => (
          <button
            key={a}
            onClick={() => onTextAlignChange(a)}
            className={`w-6 h-6 rounded-md flex items-center justify-center transition-all flex-shrink-0
              ${textAlign === a ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-[#222]'}
            `}
            title={t[`textAlign${a.charAt(0).toUpperCase() + a.slice(1)}`] || a}
          >
            {alignIcons[a]}
          </button>
        ))}
      </div>

      {divider}

      {/* Direction — LTR / RTL */}
      <div className="flex items-center gap-0.5">
        {TEXT_DIRECTIONS.map((d) => (
          <button
            key={d}
            onClick={() => onDirectionChange(d)}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase transition-all flex-shrink-0
              ${direction === d ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-[#222]'}
            `}
            title={d === 'ltr' ? (t.dirLTR || 'Left to Right') : (t.dirRTL || 'Right to Left')}
          >
            {d.toUpperCase()}
          </button>
        ))}
      </div>

      {divider}

      {/* Size indicator */}
      <div className="flex items-center gap-1.5">
        <div className="w-12 h-1.5 bg-stone-200 dark:bg-[#222] rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${((fontSize - TEXT_SIZE_MIN) / (TEXT_SIZE_MAX - TEXT_SIZE_MIN)) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {Math.round((fontSize / TEXT_DEFAULT_SIZE) * 100)}%
        </span>
      </div>
    </div>
  )
}
