import { useState, useEffect } from 'react'
import { useLanguage } from '../../i18n/LanguageContext'
import {
  TEXT_FONTS, TEXT_COLORS, TEXT_BG_COLORS,
  TEXT_DEFAULT_FONT, TEXT_DEFAULT_SIZE, TEXT_DEFAULT_COLOR, TEXT_DEFAULT_BG_COLOR,
  TEXT_SIZE_MIN, TEXT_SIZE_MAX,
} from '../../constants/annotation'

export default function TextInputPopover({ position, onAdd, onCancel, onPreview, fontSize: externalSize }) {
  const { t } = useLanguage()
  const [text, setText] = useState('')
  const [font, setFont] = useState(TEXT_DEFAULT_FONT)
  const [color, setColor] = useState(TEXT_DEFAULT_COLOR)
  const [customColor, setCustomColor] = useState(TEXT_DEFAULT_COLOR)
  const [bgColor, setBgColor] = useState(TEXT_DEFAULT_BG_COLOR)
  const [customBgColor, setCustomBgColor] = useState('#1a3a6b')

  const size = externalSize ?? TEXT_DEFAULT_SIZE

  function handleAdd() {
    if (!text.trim()) return
    onAdd({ text: text.trim(), fontSize: size, fontFamily: font, color, bgColor })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  // Fire live preview on every change
  useEffect(() => {
    onPreview?.({
      text: text.trim(),
      fontSize: size,
      fontFamily: font,
      color,
      bgColor,
    })
  }, [text, size, font, color, bgColor]) // eslint-disable-line

  // Position the popover using fixed viewport coordinates so it escapes overflow-hidden
  const popoverHeight = 380
  const showBelow = position.vy < popoverHeight + 20
  const style = {
    position: 'fixed',
    left: `${position.vx}px`,
    top: showBelow ? `${position.vy + 12}px` : `${position.vy - 12}px`,
    transform: showBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)',
    zIndex: 9999,
  }

  return (
    <div
      style={style}
      className="bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#3a3a3a] rounded-xl shadow-2xl p-3 w-64"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Text input */}
      <input
        autoFocus
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t.textPlaceholder}
        className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
      />

      {/* Font selector */}
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t.textFont}</p>
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          className="w-full px-2 py-1.5 rounded-lg border border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#111] text-gray-900 dark:text-white text-xs focus:outline-none"
        >
          {TEXT_FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>
      </div>

      {/* Size indicator (controlled by scroll/pinch on canvas) */}
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t.textSize}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-stone-200 dark:bg-[#222] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${((size - TEXT_SIZE_MIN) / (TEXT_SIZE_MAX - TEXT_SIZE_MIN)) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 min-w-[32px] text-center">
            {Math.round((size / TEXT_DEFAULT_SIZE) * 100)}%
          </span>
        </div>
        <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-0.5">{t.textSizeHint}</p>
      </div>

      {/* Color selector */}
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t.textColor}</p>
        <div className="flex items-center gap-1.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setCustomColor(c) }}
              className={`w-6 h-6 rounded-full border-2 transition-all
                ${color === c ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}
              `}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* Custom color picker */}
          <div className="relative">
            <input
              type="color"
              value={customColor}
              onChange={(e) => { setCustomColor(e.target.value); setColor(e.target.value) }}
              className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer"
            />
            <div
              className={`w-6 h-6 rounded-full border-2 transition-all overflow-hidden
                ${!TEXT_COLORS.includes(color) ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}
              `}
              style={{
                background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Background color selector */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{t.textBgColor}</p>
        <div className="flex items-center gap-1.5">
          {TEXT_BG_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setBgColor(c); if (c !== 'transparent') setCustomBgColor(c) }}
              className={`w-6 h-6 rounded-full border-2 transition-all overflow-hidden
                ${bgColor === c ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}
              `}
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
          {/* Custom bg color picker */}
          <div className="relative">
            <input
              type="color"
              value={customBgColor}
              onChange={(e) => { setCustomBgColor(e.target.value); setBgColor(e.target.value) }}
              className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer"
            />
            <div
              className={`w-6 h-6 rounded-full border-2 transition-all overflow-hidden
                ${bgColor !== 'transparent' && !TEXT_BG_COLORS.includes(bgColor) ? 'border-blue-400 scale-110' : 'border-stone-300 dark:border-[#3a3a3a]'}
              `}
              style={{
                background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-stone-100 dark:bg-[#222] text-gray-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-[#2a2a2a] transition-colors"
        >
          {t.textCancel}
        </button>
        <button
          onClick={handleAdd}
          disabled={!text.trim()}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors
            ${text.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-stone-200 dark:bg-[#2a2a2a] text-gray-400 cursor-not-allowed'}
          `}
        >
          {t.textAdd}
        </button>
      </div>
    </div>
  )
}
