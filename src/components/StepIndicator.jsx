export default function StepIndicator({ currentStep, subProgress = 1 }) {
  const TOTAL_STEPS = 3
  const progress = ((currentStep - 1 + subProgress) / TOTAL_STEPS) * 100

  return (
    <div className="px-6 pt-2 pb-0">
      <div className="h-1 w-full max-w-md mx-auto bg-stone-200 dark:bg-[#2a2a2a] rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-800 dark:bg-white rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
