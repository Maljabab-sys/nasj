import { useState, useRef, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { cropImage } from './cropImage'
import { useLanguage } from '../../i18n/LanguageContext'

function getDefaultCrop(imgWidth, imgHeight) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, 1, imgWidth, imgHeight),
    imgWidth,
    imgHeight,
  )
}

export default function CropEditor({ dataURL, label, onApply, onSkip }) {
  const { t } = useLanguage()
  const imgRef = useRef(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState(null)

  const onImageLoad = useCallback((e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    setCrop(getDefaultCrop(w, h))
  }, [])

  function handleApply() {
    if (!completedCrop || !imgRef.current) return
    const result = cropImage(imgRef.current, completedCrop)
    onApply(result)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-gray-700 dark:text-gray-300 text-sm font-semibold uppercase tracking-widest">
        {t.cropSubLabel(label)}
      </div>

      <div className="max-w-full overflow-auto rounded-xl bg-stone-100 dark:bg-[#1a1a1a] p-2">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={undefined}
          minWidth={50}
          minHeight={50}
        >
          <img
            ref={imgRef}
            src={dataURL}
            alt={label}
            onLoad={onImageLoad}
            style={{ maxHeight: '55vh', maxWidth: '100%', display: 'block' }}
          />
        </ReactCrop>
      </div>

      <p className="text-gray-500 text-xs text-center">{t.cropHint}</p>

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-stone-200 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 hover:bg-stone-300 dark:hover:bg-[#333] transition-colors"
        >
          {t.btnSkipOriginal}
        </button>
        <button
          onClick={handleApply}
          disabled={!completedCrop}
          className={`px-6 py-2 rounded-lg text-sm font-semibold transition-colors
            ${completedCrop
              ? 'bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500'
              : 'bg-stone-200 dark:bg-[#2a2a2a] text-stone-400 dark:text-gray-500 cursor-not-allowed'}
          `}
        >
          {t.btnApplyCrop}
        </button>
      </div>
    </div>
  )
}
