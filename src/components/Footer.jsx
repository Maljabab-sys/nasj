import { useLanguage } from '../i18n/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="border-t border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#111] px-6 py-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-gray-400 dark:text-gray-600 text-[10px]">{t.footerBy}</p>
        <p className="text-gray-400 dark:text-gray-600 text-[10px]">{t.footerCopyright}</p>
      </div>
    </footer>
  )
}
