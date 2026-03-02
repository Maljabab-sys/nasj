import { useState } from 'react'
import AnnotationCanvas from '../features/annotation/AnnotationCanvas'
import { useLanguage } from '../i18n/LanguageContext'
import Stagger from '../components/Stagger'

export default function AnnotatePage({ beforeCropped, afterCropped, onDone, onBack }) {
  const { t } = useLanguage()
  const [subStep, setSubStep] = useState('before') // 'before' | 'after'
  const [beforeStrokes, setBeforeStrokes] = useState([])
  const [afterStrokes, setAfterStrokes] = useState([])

  function handleBeforeNext() {
    setSubStep('after')
  }

  function handleAfterDone() {
    onDone(beforeStrokes, afterStrokes)
  }

  const isBefore = subStep === 'before'
  const imageURL = isBefore ? beforeCropped : afterCropped
  const label = isBefore ? t.slotBefore : t.slotAfter

  return (
    <div className="max-w-2xl mx-auto w-full px-4">
      <Stagger gap={80} start={40}>
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-gray-900 dark:text-white text-base sm:text-lg font-semibold">{t.annotateHeading(label)}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t.annotateDesc}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0 mt-1">
              {['before', 'after'].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full ${subStep === s ? 'bg-blue-500' : 'bg-stone-300 dark:bg-[#3a3a3a]'}`}
                />
              ))}
            </div>
          </div>
        </div>

        <AnnotationCanvas
          key={subStep}
          imageDataURL={imageURL}
          initialStrokes={isBefore ? beforeStrokes : afterStrokes}
          onStrokesChange={isBefore ? setBeforeStrokes : setAfterStrokes}
        />

        <div className="flex flex-wrap justify-between gap-2 mt-6">
          <button
            onClick={isBefore ? onBack : () => setSubStep('before')}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-stone-100 dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-[#2a2a2a] transition-colors"
          >
            {t.btnBack}
          </button>

          <div className="flex gap-3">
            {isBefore ? (
              <>
                <button
                  onClick={() => { setBeforeStrokes([]); setSubStep('after') }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-stone-200 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-stone-300 dark:hover:bg-[#333] transition-colors"
                >
                  {t.btnSkipBefore}
                </button>
                <button
                  onClick={handleBeforeNext}
                  className="px-6 py-2 rounded-lg text-sm font-semibold bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
                >
                  {t.btnNextAfter}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setAfterStrokes([]); handleAfterDone() }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-stone-200 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-stone-300 dark:hover:bg-[#333] transition-colors"
                >
                  {t.btnSkipAfter}
                </button>
                <button
                  onClick={handleAfterDone}
                  className="px-6 py-2 rounded-lg text-sm font-semibold bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
                >
                  {t.btnNextCompose}
                </button>
              </>
            )}
          </div>
        </div>
      </Stagger>
    </div>
  )
}
