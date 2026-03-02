import { useLanguage } from '../../i18n/LanguageContext'

export default function AnnotationToolbar({ activeTool, setActiveTool, onAutoArch, onUndo, onClear, hasStrokes }) {
  const { t } = useLanguage()
  const TOOLS = [
    { id: 'free', label: t.toolFreeDraw, hint: t.toolFreeDrawHint, icon: '✏️' },
    { id: 'points', label: t.toolPointToPoint, hint: t.toolPointToPointHint, icon: '🖊' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-[#1a1a1a] rounded-xl border border-stone-200 dark:border-[#2a2a2a]">
      {/* Drawing tools */}
      <div className="flex gap-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            title={tool.hint}
            onClick={() => setActiveTool(tool.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5
              ${activeTool === tool.id
                ? 'bg-blue-600 text-white border border-blue-500'
                : 'bg-stone-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border border-stone-300 dark:border-[#3a3a3a] hover:bg-stone-200 dark:hover:bg-[#333] hover:text-gray-900 dark:hover:text-white'}
            `}
          >
            <span>{tool.icon}</span>
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-stone-300 dark:bg-[#3a3a3a]" />

      {/* Auto-arch buttons */}
      <div className="flex gap-1.5">
        <button
          title={t.toolIncisalArchTitle}
          onClick={() => onAutoArch('incisal')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-[#1a2a4a] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-[#2a4a7a] hover:bg-blue-100 dark:hover:bg-[#1e3260] transition-colors flex items-center gap-1.5"
        >
          <span>⚡</span>
          <span className="hidden sm:inline">{t.toolIncisalArch}</span>
        </button>
        <button
          title={t.toolFullArchTitle}
          onClick={() => onAutoArch('arch_upper')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-[#1a2a4a] text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-[#2a4a7a] hover:bg-blue-100 dark:hover:bg-[#1e3260] transition-colors flex items-center gap-1.5"
        >
          <span>⚡</span>
          <span className="hidden sm:inline">{t.toolFullArch}</span>
        </button>
      </div>

      <div className="w-px h-6 bg-stone-300 dark:bg-[#3a3a3a]" />

      {/* Undo / Clear */}
      <div className="flex gap-1.5 ml-auto">
        <button
          onClick={onUndo}
          disabled={!hasStrokes}
          title={t.toolUndoTitle}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
            ${hasStrokes
              ? 'bg-stone-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 border border-stone-300 dark:border-[#3a3a3a] hover:bg-stone-200 dark:hover:bg-[#333] hover:text-gray-900 dark:hover:text-white'
              : 'bg-stone-50 dark:bg-[#1a1a1a] text-gray-400 dark:text-gray-600 border border-stone-200 dark:border-[#222] cursor-not-allowed'}
          `}
        >
          {t.toolUndo}
        </button>
        <button
          onClick={onClear}
          disabled={!hasStrokes}
          title={t.toolClearTitle}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
            ${hasStrokes
              ? 'bg-red-50 dark:bg-[#2a1a1a] text-red-600 dark:text-red-400 border border-red-200 dark:border-[#5a2a2a] hover:bg-red-100 dark:hover:bg-[#3a1a1a] hover:text-red-700 dark:hover:text-red-300'
              : 'bg-stone-50 dark:bg-[#1a1a1a] text-gray-400 dark:text-gray-600 border border-stone-200 dark:border-[#222] cursor-not-allowed'}
          `}
        >
          {t.toolClear}
        </button>
      </div>
    </div>
  )
}
