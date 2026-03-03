import { useState, useCallback, useEffect, useRef } from 'react'
import { useLanguage } from './i18n/LanguageContext'
import { useTheme } from './i18n/ThemeContext'
import Header from './components/Header'
import Footer from './components/Footer'
import NavBar from './components/NavBar'
import Stagger from './components/Stagger'
import UploadPage from './pages/UploadPage'
import CaptionPage from './pages/CaptionPage'
import CaptionResultsPage from './pages/CaptionResultsPage'
import ReviewPage from './pages/ReviewPage'
import { useBatchCaptionGenerator } from './features/caption/useBatchCaptionGenerator'
import { cacheGet, cacheSet, cacheClear } from './utils/sessionCache'

export const EMPTY_POST = {
  id: null,
  postType: 'single',       // 'beforeafter' | 'single'
  layoutMode: 'single',     // 'stacked' | 'sidebyside' | 'single'
  format: 'square',        // 'square' | 'portrait' | 'story'
  beforeCropped: null,
  afterCropped: null,
  beforeStrokes: [],
  afterStrokes: [],
  singleTarget: null,
  watermarkText: '',
  bgColor: 'white',
  selectedTemplate: 'classic',
  selectedCaption: null,
  selectedHashtags: [],
}

const INITIAL_STATE = {
  step: 1,
  multiMode: 'single',     // 'single' | 'multiple'
  posts: [{ ...EMPTY_POST, id: 'post-0' }],
}

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)
  const [subProgress, setSubProgress] = useState(0)
  const loaded = useRef(false)
  const { t, lang } = useLanguage()
  const { isDark } = useTheme()
  const batchGen = useBatchCaptionGenerator()

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

  // Set nav for step 4 / ReviewPage (steps 1-3 managed by their pages via onNavUpdate)
  useEffect(() => {
    if (state.step === 4) {
      updateNav({
        backLabel: t.btnBackResults || 'Back',
        onBack: () => update({ step: 3 }),
      })
    }
  }, [state.step, t.btnBackResults, updateNav]) // eslint-disable-line

  const progress = ((state.step - 1 + (state.step === 1 ? subProgress : 1)) / 4) * 100

  // Restore cached app state on mount
  useEffect(() => {
    cacheGet('app').then((cached) => {
      if (cached) {
        // Migrate old flat state to new posts-array format
        if (cached.beforeCropped !== undefined && !cached.posts) {
          const { step, category, ...postFields } = cached
          if (postFields.bgColor === 'black') postFields.bgColor = 'white'
          setState((prev) => ({
            ...prev,
            step: step || 1,
            multiMode: 'single',
            posts: [{ ...EMPTY_POST, id: 'post-0', ...postFields }],
          }))
        } else {
          setState((prev) => ({ ...prev, ...cached }))
        }
      }
      loaded.current = true
    }).catch(() => { loaded.current = true })
  }, [])

  // Save app state whenever it changes (strip large data URLs to keep cache small)
  useEffect(() => {
    if (!loaded.current) return
    const cacheable = {
      step: state.step,
      multiMode: state.multiMode,
      posts: state.posts.map((p) => ({
        ...p,
        beforeCropped: null,
        afterCropped: null,
      })),
    }
    cacheSet('app', cacheable).catch(() => {})
  }, [state])

  function update(patch) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  const handleClearSession = useCallback(() => {
    cacheClear().catch(() => {})
  }, [])

  const handleSubProgress = useCallback((p) => setSubProgress(p), [])

  return (
    <div className="flex flex-col min-h-dvh bg-stone-50 dark:bg-[#0f0f0f]">
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
              initialPosts={state.posts}
              initialMultiMode={state.multiMode}
              onNext={({ posts, multiMode }) =>
                update({ posts, multiMode, step: 2 })
              }
              onSubProgress={handleSubProgress}
              onNavUpdate={updateNav}
            />
          </div>

          {state.step === 2 && (
            <CaptionPage
              lang={lang}
              batchGen={batchGen}
              posts={state.posts}
              onNext={() => update({ step: 3 })}
              onBack={() => update({ step: 1 })}
              onSkip={() => update({
                posts: state.posts.map((p) => ({ ...p, selectedCaption: null, selectedHashtags: [] })),
                step: 4,
              })}
              onNavUpdate={updateNav}
            />
          )}

          {state.step === 3 && (
            <CaptionResultsPage
              lang={lang}
              batchGen={batchGen}
              posts={state.posts}
              onNext={({ posts }) => update({ posts, step: 4 })}
              onBack={() => update({ step: 2 })}
              onNavUpdate={updateNav}
            />
          )}

          {state.step === 4 && (
            <ReviewPage
              posts={state.posts}
              onBack={() => update({ step: 3 })}
              onClearSession={handleClearSession}
            />
          )}
        </main>

        {state.step === 4 ? <Footer /> : null}
      </Stagger>
    </div>
  )
}
