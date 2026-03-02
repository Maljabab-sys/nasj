import { useState } from 'react'
import { useLanguage } from './i18n/LanguageContext'
import { useTheme } from './i18n/ThemeContext'
import Header from './components/Header'
import Footer from './components/Footer'
import StepIndicator from './components/StepIndicator'
import Stagger from './components/Stagger'
import UploadPage from './pages/UploadPage'
import CropPage from './pages/CropPage'
import AnnotatePage from './pages/AnnotatePage'
import ComposePage from './pages/ComposePage'

const INITIAL_STATE = {
  step: 1,
  beforeRaw: null,
  afterRaw: null,
  beforeCropped: null,
  afterCropped: null,
  beforeStrokes: [],
  afterStrokes: [],
  layoutMode: 'stacked',   // pre-selected from step 1
  singleTarget: null,
}

export default function App() {
  const [state, setState] = useState(INITIAL_STATE)
  const { lang } = useLanguage()
  const { isDark } = useTheme()

  function update(patch) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  function goToStep(step) {
    setState((prev) => ({ ...prev, step }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 dark:bg-[#0f0f0f]">
      <Stagger gap={70} start={0} getClassName={(i) => i === 2 ? 'flex-1 flex flex-col' : ''}>
        <Header />
        <StepIndicator currentStep={state.step} onStepClick={goToStep} />

        <main className="flex-1 flex flex-col py-2">
          {state.step === 1 && (
            <UploadPage
              onNext={({ beforeRaw, afterRaw, layoutMode, singleTarget }) =>
                update({ beforeRaw, afterRaw, layoutMode, singleTarget, step: 2 })
              }
            />
          )}

          {state.step === 2 && (
            <CropPage
              beforeRaw={state.beforeRaw}
              afterRaw={state.afterRaw}
              onDone={(beforeCropped, afterCropped) =>
                update({ beforeCropped, afterCropped, step: 3 })
              }
              onBack={() => update({ step: 1 })}
            />
          )}

          {state.step === 3 && (
            <AnnotatePage
              beforeCropped={state.beforeCropped}
              afterCropped={state.afterCropped}
              onDone={(beforeStrokes, afterStrokes) =>
                update({ beforeStrokes, afterStrokes, step: 4 })
              }
              onBack={() => update({ step: 2 })}
            />
          )}

          {state.step === 4 && (
            <ComposePage
              beforeCropped={state.beforeCropped}
              afterCropped={state.afterCropped}
              beforeStrokes={state.beforeStrokes}
              afterStrokes={state.afterStrokes}
              initialLayout={state.layoutMode}
              initialSingleTarget={state.singleTarget}
              onBack={() => update({ step: 3 })}
            />
          )}
        </main>

        <Footer />
      </Stagger>
    </div>
  )
}
