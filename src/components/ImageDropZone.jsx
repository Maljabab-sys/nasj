import { useRef, useState } from 'react'

export default function ImageDropZone({ label, dataURL, onFileSelected }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  function readFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => onFileSelected(e.target.result)
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    readFile(file)
  }

  function handleChange(e) {
    readFile(e.target.files[0])
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-gray-300 text-sm font-semibold uppercase tracking-widest">{label}</span>
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden
          ${dragging ? 'border-blue-500 bg-blue-950/20' : 'border-[#3a3a3a] bg-[#1a1a1a] hover:border-blue-600 hover:bg-[#1f1f1f]'}
        `}
        style={{ aspectRatio: '1/1', minHeight: 180, maxHeight: 320 }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {dataURL ? (
          <>
            <img
              src={dataURL}
              alt={label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-semibold">Click to change</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <svg className="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-gray-300 text-sm font-medium">Drop image here</p>
              <p className="text-gray-500 text-xs mt-1">or click to browse</p>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  )
}
