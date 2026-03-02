import { createContext, useContext, useState, useEffect } from 'react'
import en from './en'
import ar from './ar'

const translations = { en, ar }

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('ar')

  const isArabic = lang === 'ar'

  // Apply dir + font class to <html> whenever lang changes
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('dir', isArabic ? 'rtl' : 'ltr')
    html.setAttribute('lang', lang)
    if (isArabic) {
      html.classList.add('font-arabic')
    } else {
      html.classList.remove('font-arabic')
    }
  }, [lang, isArabic])

  const t = translations[lang]

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isArabic }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
