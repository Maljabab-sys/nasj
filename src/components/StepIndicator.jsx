import { useLanguage } from '../i18n/LanguageContext'

export default function StepIndicator({ currentStep, onStepClick }) {
  const { t } = useLanguage()
  const STEPS = [t.stepUpload, t.stepCrop, t.stepAnnotate, t.stepCompose]
  return (
    <div className="flex items-center justify-center py-6 px-4">
      {STEPS.map((label, index) => {
        const step = index + 1
        const isCompleted = step < currentStep
        const isActive = step === currentStep

        return (
          <div key={step} className="flex items-center">
            <button
              onClick={() => isCompleted && onStepClick(step)}
              className={`flex flex-col items-center gap-1 group ${isCompleted ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors
                  ${isActive ? 'bg-blue-600 border-blue-600 text-white' : ''}
                  ${isCompleted ? 'bg-green-600 border-green-600 text-white group-hover:bg-green-500' : ''}
                  ${!isActive && !isCompleted ? 'bg-stone-100 dark:bg-[#1a1a1a] border-stone-300 dark:border-[#3a3a3a] text-gray-400 dark:text-gray-500' : ''}
                `}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block
                  ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}
                  ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}
                  ${!isActive && !isCompleted ? 'text-gray-400 dark:text-gray-500' : ''}
                `}
              >
                {label}
              </span>
            </button>

            {index < STEPS.length - 1 && (
              <div
                className={`w-12 sm:w-20 h-0.5 mx-1 transition-colors ${
                  isCompleted ? 'bg-green-600' : 'bg-stone-200 dark:bg-[#2a2a2a]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
