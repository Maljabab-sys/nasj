export default function SidebarButton({ icon, label, active, disabled, onClick }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex flex-col items-center justify-center gap-0.5 w-14 py-2 rounded-lg text-[10px] font-medium transition-colors
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : ''}
        ${!active && !disabled ? 'text-gray-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-[#222]' : ''}
      `}
    >
      <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
      <span className="leading-tight whitespace-nowrap">{label}</span>
    </button>
  )
}
