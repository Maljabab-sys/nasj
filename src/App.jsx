import { useState, useCallback, useEffect, useRef } from 'react'
import { useLanguage } from './i18n/LanguageContext'
import { useTheme } from './i18n/ThemeContext'
import Header from './components/Header'
import Footer from './components/Footer'
import NavBar from './components/NavBar'
import Stagger from './components/Stagger'
import UploadPage from './pages/UploadPage'
import CaptionPage from './pages/CaptionPage'
import ReviewPage from './pages/ReviewPage'
import { useCaptionGenerator } from './features/caption/useCaptionGenerator'
import { cacheGet, cacheSet, cacheClear } from './utils/sessionCache'

const INITIAL_STATE = {
  step: 1,
  beforeCropped: null,
  afterCropped: null,
  beforeStrokes: [],
  afterStrokes: [],
  layoutMode: 'stacked',
  singleTarget: null,
  format: 'square',
  category: null,
  postType: null,
  watermarkText: '',
  bgColor: 'white',
  selectedTemplate: 'classic',
  selectedCaption: null,
  selectedHashtags: [],
}

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)
  const [subProgress, setSubProgress] = useState(0)
  const loaded = useRef(false)
  const { t, lang } = useLanguage()
  const { isDark } = useTheme()
  const captionGen = useCaptionGenerator()

  // ── Nav bar state ─────────────────────────────────────────────────────
  const navActionsRef = useRef({ back: null, next: null })
  const [navUI, setNavUI] = useState({
    backLabel: '', showBack: false,
    nextLabel: '', showNext: false,
    nextDisabled: true,
  })

  const updateNav = useCallback((config) => {
    navActionsRef.current.back = config.onBack || null
    navActionsRef.current.next = config.onNext || null
    setNavUI({
      backLabel: config.backLabel || '',
      showBack: !!config.onBack,
      nextLabel: config.nextLabel || '',
      showNext: !!config.onNext,
      nextDisabled: config.nextDisabled ?? true,
    })
  }, [])

  // Set nav for step 3 (steps 1+2 managed by their pages via onNavUpdate)
  useEffect(() => {
    if (state.step === 3) {
      updateNav({
        backLabel: t.btnBackCaption || 'Back',
        onBack: () => update({ step: 2 }),
      })
    }
  }, [state.step, t.btnBackCaption, updateNav]) // eslint-disable-line

  const progress = ((state.step - 1 + (state.step === 1 ? subProgress : 1)) / 3) * 100

  // Restore cached app state on mount
  useEffect(() => {
    cacheGet('app').then((cached) => {
      if (cached) {
        if (cached.bgColor === 'black') cached.bgColor = 'white'
        setState((prev) => ({ ...prev, ...cached }))
      }
      loaded.current = true
    }).catch(() => { loaded.current = true })
  }, [])

  // Save app state whenever it changes
  useEffect(() => {
    if (!loaded.current) return
    cacheSet('app', state).catch(() => {})
  }, [state])

  function update(patch) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  const handleClearSession = useCallback(() => {
    cacheClear().catch(() => {})
  }, [])

  const handleSubProgress = useCallback((p) => setSubProgress(p), [])

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 dark:bg-[#0f0f0f]">
      <Stagger gap={70} start={0} getClassName={(i) => i === 2 ? 'flex-1 flex flex-col min-h-0' : ''}>
        <Header />
        <NavBar
          backLabel={navUI.backLabel}
          onBack={navUI.showBack ? () => navActionsRef.current.back?.() : null}
          nextLabel={navUI.nextLabel}
          onNext={navUI.showNext ? () => navActionsRef.current.next?.() : null}
          nextDisabled={navUI.nextDisabled}
          progress={progress}
        />

        <main className="flex-1 flex flex-col min-h-0">
          <div className={state.step === 1 ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
            <UploadPage
              step={state.step}
              onNext={({ beforeCropped, afterCropped, beforeStrokes, afterStrokes, layoutMode, singleTarget, format, category, postType, watermarkText, bgColor, selectedTemplate }) =>
                update({ beforeCropped, afterCropped, beforeStrokes, afterStrokes, layoutMode, singleTarget, format, category, postType, watermarkText, bgColor, selectedTemplate, step: 2 })
              }
              onSubProgress={handleSubProgress}
              onNavUpdate={updateNav}
            />
          </div>

          {state.step === 2 && (
            <CaptionPage
              lang={lang}
              captionGen={captionGen}
              onNext={({ selectedCaption, selectedHashtags }) =>
                update({ selectedCaption, selectedHashtags, step: 3 })
              }
              onBack={() => update({ step: 1 })}
              onSkip={() => update({ selectedCaption: null, selectedHashtags: [], step: 3 })}
              onNavUpdate={updateNav}
            />
          )}

          {state.step === 3 && (
            <ReviewPage
              beforeCropped={state.beforeCropped}
              afterCropped={state.afterCropped}
              beforeStrokes={state.beforeStrokes}
              afterStrokes={state.afterStrokes}
              layoutMode={state.layoutMode}
              singleTarget={state.singleTarget}
              format={state.format}
              watermarkText={state.watermarkText}
              bgColor={state.bgColor}
              selectedTemplate={state.selectedTemplate}
              selectedCaption={state.selectedCaption}
              selectedHashtags={state.selectedHashtags}
              onBack={() => update({ step: 2 })}
              onClearSession={handleClearSession}
            />
          )}
        </main>

        {state.step === 3 ? <Footer /> : null}
      </Stagger>
    </div>
  )
}
