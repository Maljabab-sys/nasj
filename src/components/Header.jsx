import { useLanguage } from '../i18n/LanguageContext'
import { useTheme } from '../i18n/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function Header() {
  const { lang, setLang, t } = useLanguage()
  const { isDark, toggleTheme } = useTheme()

  // Desktop: compact dot-only badge; Mobile: full text badge
  const privacyBadgeFull = (
    <div className="flex items-center gap-2 bg-green-50 dark:bg-[#0d1f0d] border border-green-300 dark:border-green-800 px-3 py-1.5 rounded-full whitespace-nowrap">
      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
      <span className="text-green-700 dark:text-green-400 text-xs">{t.privacyBadge}</span>
    </div>
  )
  const privacyBadgeCompact = (
    <div
      className="flex items-center gap-1.5 bg-green-50 dark:bg-[#0d1f0d] border border-green-300 dark:border-green-800 px-2 py-1 rounded-full"
      title={t.privacyBadge}
    >
      <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse"></span>
      <span className="text-green-700 dark:text-green-400 text-[10px] font-medium whitespace-nowrap">{t.privacyBadge}</span>
    </div>
  )

  return (
    <header className="bg-white dark:bg-[#111] border-b border-stone-200 dark:border-[#2a2a2a] px-4 sm:px-6 py-3">
      {/* Desktop: single row — logo | badge (centered) | controls */}
      <div className="hidden sm:flex items-center justify-between gap-3">
        <img src="/nasj-wide.png" alt="Nasj" className="h-12 w-auto dark:invert flex-shrink-0" />
        {privacyBadgeCompact}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-stone-300 dark:border-[#3a3a3a] bg-stone-100 dark:bg-[#1a1a1a] hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-[#1a2540] transition-all duration-200"
            title={isDark ? t.switchToLight : t.switchToDark}
            aria-label={isDark ? t.switchToLight : t.switchToDark}
          >
            {isDark
              ? <Sun className="w-4 h-4 text-amber-400" strokeWidth={2} />
              : <Moon className="w-4 h-4 text-gray-500" strokeWidth={2} />
            }
          </button>
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-stone-300 dark:border-[#3a3a3a] bg-stone-100 dark:bg-[#1a1a1a] hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-[#1a2540] transition-all duration-200 group"
            title={lang === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
          >
            <span
              className="text-xs font-semibold text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
              style={lang === 'en' ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : undefined}
            >
              {lang === 'en' ? 'العربية' : 'English'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile: single row — logo | badge (centered) | controls */}
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <img src="/nasj-wide.png" alt="Nasj" className="h-10 w-auto dark:invert flex-shrink-0" />
        {privacyBadgeCompact}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-full border border-stone-300 dark:border-[#3a3a3a] bg-stone-100 dark:bg-[#1a1a1a]"
            aria-label={isDark ? t.switchToLight : t.switchToDark}
          >
            {isDark
              ? <Sun className="w-4 h-4 text-amber-400" strokeWidth={2} />
              : <Moon className="w-4 h-4 text-gray-500" strokeWidth={2} />
            }
          </button>
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center px-3 h-9 rounded-full border border-stone-300 dark:border-[#3a3a3a] bg-stone-100 dark:bg-[#1a1a1a]"
          >
            <span
              className="text-xs font-semibold text-gray-500 dark:text-gray-400"
              style={lang === 'en' ? { fontFamily: "'Noto Sans Arabic', sans-serif" } : undefined}
            >
              {lang === 'en' ? 'ع' : 'EN'}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
