import { useState } from 'react'
import CropEditor from '../features/crop/CropEditor'
import { useLanguage } from '../i18n/LanguageContext'
import Stagger from '../components/Stagger'

export default function CropPage({ beforeRaw, afterRaw, onDone, onBack }) {
  const { t } = useLanguage()
  const [subStep, setSubStep] = useState('before') // 'before' | 'after'
  const [beforeCropped, setBeforeCropped] = useState(null)

  function handleBeforeApply(dataURL) {
    setBeforeCropped(dataURL)
    setSubStep('after')
  }

  function handleBeforeSkip() {
    setBeforeCropped(beforeRaw)
    setSubStep('after')
  }

  function handleAfterApply(dataURL) {
    onDone(beforeCropped, dataURL)
  }

  function handleAfterSkip() {
    onDone(beforeCropped, afterRaw)
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-4">
      <Stagger gap={80} start={40}>
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-gray-900 dark:text-white text-base sm:text-lg font-semibold">{t.cropHeading}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t.cropDesc}</p>
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

        {subStep === 'before' ? (
          <CropEditor
            dataURL={beforeRaw}
            label={t.slotBefore}
            onApply={handleBeforeApply}
            onSkip={handleBeforeSkip}
          />
        ) : (
          <CropEditor
            dataURL={afterRaw}
            label={t.slotAfter}
            onApply={handleAfterApply}
            onSkip={handleAfterSkip}
          />
        )}

        <div className="flex justify-start mt-6">
          <button
            onClick={subStep === 'before' ? onBack : () => setSubStep('before')}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-stone-100 dark:bg-[#1a1a1a] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-[#2a2a2a] transition-colors"
          >
            {t.btnBack}
          </button>
        </div>
      </Stagger>
    </div>
  )
}
