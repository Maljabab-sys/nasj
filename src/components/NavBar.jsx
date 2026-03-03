export default function NavBar({ backLabel, onBack, nextLabel, onNext, nextDisabled, progress }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] flex-shrink-0">
      {/* Back */}
      <div className="w-40 flex-shrink-0">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 text-sm font-medium transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10 px-3 py-1.5 truncate"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="truncate">{backLabel}</span>
          </button>
        ) : <div />}
      </div>

      {/* Progress bar */}
      <div className="flex-1 max-w-sm mx-auto">
        <div className="h-1.5 w-full bg-stone-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-800 dark:bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Next */}
      <div className="w-40 flex-shrink-0 flex justify-end">
        {onNext ? (
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold text-sm transition-colors whitespace-nowrap
              ${!nextDisabled
                ? 'bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500'
                : 'bg-stone-200 dark:bg-[#2a2a2a] text-stone-400 dark:text-gray-500 cursor-not-allowed'}
            `}
          >
            <span>{nextLabel}</span>
            <svg className="w-3.5 h-3.5 flex-shrink-0 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : <div />}
      </div>
    </div>
  )
}
