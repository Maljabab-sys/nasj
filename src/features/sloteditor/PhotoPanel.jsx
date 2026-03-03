import { Upload } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext'

export default function PhotoPanel({
  images, slotData, selectedImageId, bulkDragging,
  inputRef,
  onBulkDrop, onBulkDragOver, onBulkDragLeave, onFileInput,
  onGalleryDragStart, onGalleryTap, onRemoveImage,
  setBulkDragging,
}) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-3 py-2.5 border-b border-stone-200 dark:border-[#2a2a2a]">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
          {t.sidebarPhotos || 'Photos'}
        </p>
        {images.length > 0 && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{t.bucketCount(images.length)}</span>
        )}
      </div>

      {/* Compact drop zone */}
      <div className="p-3">
        <div
          className={`rounded-lg border-2 border-dashed transition-colors cursor-pointer
            ${bulkDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-stone-300 dark:border-[#3a3a3a] hover:border-blue-500'}
          `}
          onDragOver={(e) => { e.preventDefault(); setBulkDragging(true) }}
          onDragLeave={() => setBulkDragging(false)}
          onDrop={onBulkDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex items-center justify-center gap-2 py-3 px-2">
            <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-600 dark:text-gray-300 text-xs font-medium truncate">{t.dropZoneHeading}</p>
              <p className="text-gray-400 text-[10px] truncate">{t.dropZoneSub}</p>
            </div>
          </div>
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFileInput} />
        </div>
      </div>

      {/* Photo grid — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => {
              const inSlot = Object.values(slotData).some((s) => s?.rawId === img.id)
              const isSelected = selectedImageId === img.id
              return (
                <div
                  key={img.id}
                  draggable
                  onDragStart={(e) => onGalleryDragStart(e, img.id)}
                  onClick={() => !inSlot && onGalleryTap(img.id)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing
                    ${inSlot ? 'border-blue-500 opacity-50' : ''}
                    ${!inSlot && isSelected ? 'border-blue-500 ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-[#1a1a1a] scale-[1.03]' : ''}
                    ${!inSlot && !isSelected ? 'border-stone-300 dark:border-[#3a3a3a] hover:border-stone-500 dark:hover:border-[#666]' : ''}
                  `}
                  style={{ aspectRatio: '1/1' }}
                  title={img.name}
                >
                  <img src={img.dataURL} alt={img.name} className="w-full h-full object-contain bg-stone-100 dark:bg-[#111]" />
                  {inSlot && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-white text-[10px] font-bold">{t.placed}</span>
                    </div>
                  )}
                  {isSelected && !inSlot && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 pointer-events-none">
                      <span className="text-blue-600 dark:text-blue-400 text-[10px] font-bold bg-white/80 dark:bg-black/60 px-1.5 py-0.5 rounded-full">{t.selected}</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveImage(img.id) }}
                    className="absolute top-1 right-1 w-4 h-4 bg-black/70 rounded-full text-white text-[10px] flex items-center justify-center hover:bg-red-600 transition-colors"
                  >×</button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <p className="text-gray-400 dark:text-gray-600 text-xs text-center">{t.noPhotos}</p>
          </div>
        )}
      </div>
    </div>
  )
}
