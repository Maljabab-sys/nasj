import { useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { Columns2, Image } from 'lucide-react'
import { FaInstagram, FaTiktok, FaXTwitter } from 'react-icons/fa6'
import { FaSnapchatGhost } from 'react-icons/fa'
import ecommerceImg from '../assets/Ecom.png'
import medicalImg from '../assets/dentalmedical.png'

// ── helpers ────────────────────────────────────────────────────────────────

function readFilesAsDataURLs(files) {
  return Promise.all(
    Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map(
        (f) =>
          new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) =>
              resolve({ id: `${f.name}-${f.size}`, name: f.name, dataURL: e.target.result })
            reader.readAsDataURL(f)
          }),
      ),
  )
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconCircle({ children, bg, ring }) {
  return (
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${bg} ring-1 ${ring}`}>
      {children}
    </div>
  )
}

function IconMedical() {
  return (
    <div className="w-28 h-28 sm:w-36 sm:h-36 -my-1 sm:-my-2">
      <img src={medicalImg} alt="Medical" className="w-full h-full object-contain scale-125 dark:brightness-0 dark:invert" />
    </div>
  )
}

function IconEcommerce() {
  return (
    <div className="w-28 h-28 sm:w-36 sm:h-36 -my-1 sm:-my-2">
      <img src={ecommerceImg} alt="E-Commerce" className="w-full h-full object-contain scale-125 dark:brightness-0 dark:invert" />
    </div>
  )
}

function IconBeforeAfter() {
  return (
    <IconCircle bg="bg-indigo-100 dark:bg-indigo-900/30" ring="ring-indigo-200 dark:ring-indigo-800">
      <Columns2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" strokeWidth={1.75} />
    </IconCircle>
  )
}

function IconSinglePhoto() {
  return (
    <IconCircle bg="bg-teal-100 dark:bg-teal-900/30" ring="ring-teal-200 dark:ring-teal-800">
      <Image className="w-7 h-7 text-teal-600 dark:text-teal-400" strokeWidth={1.75} />
    </IconCircle>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SelectionCard({ active, onClick, icon, title, subtitle, disabled, badge }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border transition-colors duration-200 text-center w-full
        ${disabled ? 'cursor-not-allowed opacity-50 border-stone-200 dark:border-[#2a2a2a] bg-stone-100 dark:bg-[#141414]' : ''}
        ${!disabled && active ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : ''}
        ${!disabled && !active ? 'border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:border-stone-400 dark:hover:border-[#444] hover:bg-stone-50 dark:hover:bg-[#1f1f1f]' : ''}
      `}
    >
      {badge && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-stone-200 dark:bg-[#2a2a2a] text-gray-500 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap z-10">
          {badge}
        </div>
      )}
      <div className="flex items-center justify-center">{icon}</div>
      <div>
        <p className={`font-semibold text-sm ${active ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{title}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {active && (
        <div className="absolute bottom-2.5 right-2.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}

function LayoutCard({ id, selected, onClick, children, label }) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex flex-col items-center gap-3 p-5 rounded-xl border transition-colors duration-200
        ${selected === id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:border-stone-400 dark:hover:border-[#444] hover:bg-stone-50 dark:hover:bg-[#1f1f1f]'}
      `}
      style={{ minWidth: 120 }}
    >
      <div className="w-24 h-24 flex items-center justify-center">{children}</div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</span>
    </button>
  )
}

function DropSlot({ label, color, image, onDrop, onClear, isDragOver, onDragOver, onDragLeave, dragHint, aspectRatio }) {
  return (
    <div
      className={`relative flex flex-col rounded-xl border-2 border-dashed transition-all overflow-hidden
        ${isDragOver ? 'border-blue-400 bg-blue-950/30 scale-[1.02]' : ''}
        ${!isDragOver && image ? (color === 'orange' ? 'border-orange-500' : 'border-green-500') : ''}
        ${!isDragOver && !image ? 'border-stone-300 dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a]' : ''}
      `}
      style={{ aspectRatio: aspectRatio === 'auto' ? undefined : (aspectRatio || '1/1'), minHeight: aspectRatio === 'auto' ? 0 : 80, flex: aspectRatio === 'auto' ? '1 1 0%' : undefined }}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(e.dataTransfer.getData('imageId')) }}
    >
      {image ? (
        <>
          <img src={image.dataURL} alt={label} className="w-full h-full object-contain bg-stone-100 dark:bg-[#111]" />
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide
            ${color === 'orange' ? 'bg-orange-500' : 'bg-green-500'} text-white`}>
            {label}
          </div>
          <button onClick={onClear} className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full text-white text-sm flex items-center justify-center hover:bg-red-600 transition-colors">×</button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center
            ${color === 'orange' ? 'border-orange-600 text-orange-500' : 'border-green-600 text-green-500'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className={`text-xs font-bold uppercase tracking-widest ${color === 'orange' ? 'text-orange-500' : 'text-green-500'}`}>{label}</span>
          <span className="text-gray-400 dark:text-gray-600 text-xs">{dragHint}</span>
        </div>
      )}
    </div>
  )
}

function Panel({ children, centered = true }) {
  return (
    <div className={centered ? 'flex flex-col items-center w-full' : 'w-full'}>
      {children}
    </div>
  )
}

// ── Breadcrumb back button ─────────────────────────────────────────────────

function BackBtn({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-semibold transition-colors mb-6"
    >
      <svg className="w-4 h-4 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      {label}
    </button>
  )
}

// ── Step header ────────────────────────────────────────────────────────────

function StepHeader({ title, desc }) {
  return (
    <div className="mb-6 text-center">
      <h2 className="text-gray-900 dark:text-white text-xl sm:text-2xl font-bold mb-1">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm">{desc}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

// subStep flow:
// B&A:    'category' → 'posttype' → 'format' → 'layout' → 'upload'
// Single: 'category' → 'posttype' → 'format' → 'upload'
export default function UploadPage({ onNext }) {
  const { t, lang } = useLanguage()
  const inputRef = useRef(null)
  const [subStep, setSubStep] = useState('category')
  const [bulkDragging, setBulkDragging] = useState(false)
  const [images, setImages] = useState([])

  const [category, setCategory] = useState(null)
  const [postType, setPostType] = useState(null)
  const [layout, setLayout] = useState(null)
  const [format, setFormat] = useState(null)   // 'square' | 'portrait' | 'story'
  const [slots, setSlots] = useState({ before: null, after: null, single: null })
  const [dragOver, setDragOver] = useState(null)

  async function addFiles(files) {
    const newImgs = await readFilesAsDataURLs(files)
    setImages((prev) => {
      const existing = new Set(prev.map((i) => i.id))
      return [...prev, ...newImgs.filter((i) => !existing.has(i.id))]
    })
  }

  function handleBulkDrop(e) {
    e.preventDefault()
    setBulkDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function handleFileInput(e) {
    addFiles(e.target.files)
    e.target.value = ''
  }

  function removeImage(id) {
    setImages((prev) => prev.filter((i) => i.id !== id))
    setSlots((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => { if (next[k] === id) next[k] = null })
      return next
    })
  }

  function handleGalleryDragStart(e, id) {
    e.dataTransfer.setData('imageId', id)
  }

  function dropIntoSlot(slotKey, imageId) {
    if (!imageId) return
    setSlots((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => { if (next[k] === imageId) next[k] = null })
      next[slotKey] = imageId
      return next
    })
    setDragOver(null)
  }

  function clearSlot(slotKey) {
    setSlots((prev) => ({ ...prev, [slotKey]: null }))
  }

  // ── Navigation helpers ───────────────────────────────────────────────────

  function pickCategory(cat) {
    setCategory(cat)
    setPostType(null)
    setLayout(null)
    setFormat(null)
    setSlots({ before: null, after: null, single: null })
    setSubStep('posttype')
  }

  function pickPostType(type) {
    setPostType(type)
    setLayout(null)
    setFormat(null)
    setSlots({ before: null, after: null, single: null })
    setSubStep('format')
  }

  function pickFormat(f) {
    setFormat(f)
    setSlots({ before: null, after: null, single: null })
    // B&A needs a layout step next; single goes straight to upload
    setSubStep(postType === 'beforeafter' ? 'layout' : 'upload')
  }

  function pickLayout(l) {
    setLayout(l)
    setSlots({ before: null, after: null, single: null })
    setSubStep('upload')
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const slotImages = {
    before: images.find((i) => i.id === slots.before) || null,
    after:  images.find((i) => i.id === slots.after)  || null,
    single: images.find((i) => i.id === slots.single) || null,
  }

  const canProceed =
    (postType === 'beforeafter' && format && layout && slotImages.before && slotImages.after) ||
    (postType === 'single' && format && slotImages.single)

  function handleNext() {
    if (!canProceed) return
    const beforeURL = postType === 'beforeafter' ? slotImages.before.dataURL : slotImages.single.dataURL
    const afterURL  = postType === 'beforeafter' ? slotImages.after.dataURL  : slotImages.single.dataURL
    onNext({ beforeRaw: beforeURL, afterRaw: afterURL, layoutMode: layout || 'single', singleTarget: postType === 'single' ? 'single' : null, format })
  }

  // Aspect ratio helpers based on format
  const FORMAT_RATIOS = { square: '1/1', portrait: '4/5', story: '9/16' }
  const templateRatio = FORMAT_RATIOS[format] || '1/1'

  // Format visual style map (matches the format selection cards)
  const FORMAT_STYLES = {
    square:   { ratio: '1:1', border: 'border-blue-400',   bg: 'bg-blue-500/10',   text: 'text-blue-500',   badgeBg: 'bg-blue-500/15' },
    portrait: { ratio: '4:5', border: 'border-purple-400', bg: 'bg-purple-500/10', text: 'text-purple-500', badgeBg: 'bg-purple-500/15' },
    story:    { ratio: '9:16', border: 'border-pink-400',  bg: 'bg-pink-500/10',   text: 'text-pink-500',   badgeBg: 'bg-pink-500/15' },
  }
  const fmtStyle = FORMAT_STYLES[format] || FORMAT_STYLES.square

  // For B&A stacked: each slot is half the height → double the width relative to height
  // e.g. square (1:1) → each slot is 1:0.5 = 2/1... but we want the overall frame to match the format
  // Better approach: the outer wrapper has the format ratio, slots just flex-fill inside it
  function renderTemplate() {
    const slotProps = (key, color) => ({
      label: key === 'single' ? t.slotPhoto : key === 'before' ? t.slotBefore : t.slotAfter,
      color,
      image: slotImages[key],
      isDragOver: dragOver === key,
      onDragOver: () => setDragOver(key),
      onDragLeave: () => setDragOver(null),
      onDrop: (id) => dropIntoSlot(key, id),
      onClear: () => clearSlot(key),
      dragHint: t.slotDragHint,
    })

    // Max width to keep the template compact
    const maxW = format === 'story' ? 'max-w-[180px]' : format === 'portrait' ? 'max-w-[240px]' : 'max-w-[260px]'

    if (postType === 'beforeafter') {
      if (layout === 'stacked') return (
        <div className={`mx-auto w-full ${maxW}`} style={{ aspectRatio: templateRatio }}>
          <div className="flex flex-col gap-1 h-full">
            <DropSlot {...slotProps('before', 'orange')} aspectRatio="auto" />
            <DropSlot {...slotProps('after', 'green')} aspectRatio="auto" />
          </div>
        </div>
      )
      if (layout === 'sidebyside') return (
        <div className={`mx-auto w-full ${maxW}`} style={{ aspectRatio: templateRatio }}>
          <div className="flex flex-row gap-1 h-full">
            <DropSlot {...slotProps('before', 'orange')} aspectRatio="auto" />
            <DropSlot {...slotProps('after', 'green')} aspectRatio="auto" />
          </div>
        </div>
      )
      return null
    }
    if (postType === 'single' && format) return (
      <div className={`mx-auto w-full ${maxW}`}>
        <DropSlot {...slotProps('single', 'green')} aspectRatio={templateRatio} />
      </div>
    )
    return null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`w-full px-4 pb-10 ${subStep === 'upload' ? 'max-w-2xl mx-auto' : 'flex flex-col items-center justify-center flex-1 min-h-[60vh]'}`}>

        {/* ── STEP: Category ─────────────────────────────────────────── */}
        {subStep === 'category' && (
          <Panel key="category">
            <StepHeader
              title={t.step1Heading}
              desc={t.step1Desc}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-[480px] mx-auto">
              <SelectionCard
                active={false}
                onClick={() => pickCategory('medical')}
                title={t.categoryMedical}
                subtitle={t.categoryMedicalSub}
                icon={<IconMedical />}
              />
              <SelectionCard
                disabled
                badge={t.comingSoon}
                title={t.categoryEcommerce}
                subtitle={t.categoryEcommerceSub}
                icon={<IconEcommerce />}
              />
            </div>
          </Panel>
        )}

        {/* ── STEP: Post Type ────────────────────────────────────────── */}
        {subStep === 'posttype' && (
          <Panel key="posttype">
            <BackBtn onClick={() => setSubStep('category')} label={t.step1Heading} />
            <StepHeader
              badge={t.step2Label}
              title={t.step2Heading}
              desc={t.step2Desc}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-[480px] mx-auto">
              <SelectionCard
                active={false}
                onClick={() => pickPostType('beforeafter')}
                icon={<IconBeforeAfter />}
                title={t.postTypeBA}
                subtitle={t.postTypeBASub}
              />
              <SelectionCard
                active={false}
                onClick={() => pickPostType('single')}
                icon={<IconSinglePhoto />}
                title={t.postTypeSingle}
                subtitle={t.postTypeSingleSub}
              />
            </div>
          </Panel>
        )}

        {/* ── STEP 3: Format (both B&A and Single) ────────────────── */}
        {subStep === 'format' && (
          <Panel key="format">
            <BackBtn onClick={() => setSubStep('posttype')} label={t.step2Heading} />
            <StepHeader
              badge={t.stepFormatLabel}
              title={t.stepFormatHeading}
              desc={t.stepFormatDesc}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-[560px] mx-auto">
              <SelectionCard
                active={format === 'square'}
                onClick={() => pickFormat('square')}
                title={t.formatSquare}
                subtitle="1080 × 1080"
                icon={
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-28 h-28 rounded-xl border-2 border-blue-400 bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-500 text-base font-bold">1:1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaInstagram className="w-5 h-5 text-pink-500" />
                      <FaXTwitter className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </div>
                  </div>
                }
              />
              <SelectionCard
                active={format === 'portrait'}
                onClick={() => pickFormat('portrait')}
                title={t.formatPortrait}
                subtitle="1080 × 1350"
                icon={
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-[90px] h-28 rounded-xl border-2 border-purple-400 bg-purple-500/10 flex items-center justify-center">
                      <span className="text-purple-500 text-base font-bold">4:5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaInstagram className="w-5 h-5 text-pink-500" />
                    </div>
                  </div>
                }
              />
              <SelectionCard
                active={format === 'story'}
                onClick={() => pickFormat('story')}
                title={t.formatStory}
                subtitle="1080 × 1920"
                icon={
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-[63px] h-28 rounded-xl border-2 border-pink-400 bg-pink-500/10 flex items-center justify-center">
                      <span className="text-pink-500 text-xs font-bold">9:16</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaInstagram className="w-5 h-5 text-pink-500" />
                      <FaTiktok className="w-4 h-4 text-gray-800 dark:text-gray-200" />
                      <FaSnapchatGhost className="w-5 h-5 text-yellow-400" />
                    </div>
                  </div>
                }
              />
            </div>
          </Panel>
        )}

        {/* ── STEP 4: Layout (B&A only) ───────────────────────────── */}
        {subStep === 'layout' && (
          <Panel key="layout">
            <BackBtn onClick={() => setSubStep('format')} label={t.stepFormatHeading} />
            <StepHeader
              badge={t.step4Label}
              title={t.step4Heading}
              desc={t.step4Desc}
            />
            <div className="flex gap-4 flex-wrap justify-center">
              <LayoutCard id="stacked" selected={layout} onClick={pickLayout} label={t.layoutStacked}>
                <div className="w-24 h-24 rounded-lg border border-stone-300 dark:border-[#3a3a3a] overflow-hidden flex flex-col">
                  <div className="flex-1 bg-orange-500/20 border-b border-stone-300 dark:border-[#3a3a3a] flex items-center justify-center">
                    <span className="text-orange-500 text-[9px] font-bold">{t.slotBefore}</span>
                  </div>
                  <div className="flex-1 bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-[9px] font-bold">{t.slotAfter}</span>
                  </div>
                </div>
              </LayoutCard>
              <LayoutCard id="sidebyside" selected={layout} onClick={pickLayout} label={t.layoutSideBySide}>
                <div className="w-24 h-24 rounded-lg border border-stone-300 dark:border-[#3a3a3a] overflow-hidden flex flex-row">
                  <div className="flex-1 bg-orange-500/20 border-e border-stone-300 dark:border-[#3a3a3a] flex items-center justify-center">
                    <span className="text-orange-500 text-[9px] font-bold">{t.slotBefore}</span>
                  </div>
                  <div className="flex-1 bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-[9px] font-bold">{t.slotAfter}</span>
                  </div>
                </div>
              </LayoutCard>
            </div>
          </Panel>
        )}

        {/* ── STEP 4/5: Upload / Gallery / Template ───────────────── */}
        {subStep === 'upload' && (
          <Panel key="upload" centered={false}>
            <BackBtn
              onClick={() => setSubStep(postType === 'beforeafter' ? 'layout' : 'format')}
              label={postType === 'beforeafter' ? t.step4Heading : t.stepFormatHeading}
            />
            <StepHeader
              badge={postType === 'beforeafter' ? t.step5Label : t.step4Label}
              title={t.step5Heading}
              desc={t.step5Desc}
            />

            {/* 1. Drop zone */}
            <div
              className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer
                ${bulkDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : 'border-stone-300 dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] hover:border-blue-600'}
              `}
              style={{ minHeight: 90 }}
              onDragOver={(e) => { e.preventDefault(); setBulkDragging(true) }}
              onDragLeave={() => setBulkDragging(false)}
              onDrop={handleBulkDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div className="flex items-center justify-center gap-3 py-5 px-4">
                <svg className="w-7 h-7 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">{t.dropZoneHeading}</p>
                  <p className="text-gray-500 text-xs">{t.dropZoneSub}</p>
                </div>
              </div>
              <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />
            </div>

            {/* 2. Gallery bucket */}
            <div className="mt-5 bg-white dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
              {/* Header bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-200 dark:border-[#2a2a2a] bg-stone-50 dark:bg-[#151515]">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-widest">
                  {t.bucketLabel}
                </p>
                {images.length > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    {t.bucketCount(images.length)}
                  </span>
                )}
              </div>
              {/* Content */}
              <div className="p-3">
                {images.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {images.map((img) => {
                      const inSlot = Object.values(slots).includes(img.id)
                      return (
                        <div
                          key={img.id}
                          draggable
                          onDragStart={(e) => handleGalleryDragStart(e, img.id)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing
                            ${inSlot ? 'border-blue-500 opacity-50' : 'border-stone-300 dark:border-[#3a3a3a] hover:border-stone-500 dark:hover:border-[#666]'}
                          `}
                          style={{ aspectRatio: '1/1' }}
                          title={img.name}
                        >
                          <img src={img.dataURL} alt={img.name} className="w-full h-full object-contain bg-stone-100 dark:bg-[#111]" />
                          {inSlot && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                              <span className="text-white text-xs font-bold">{t.placed}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                          >×</button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                    <p className="text-gray-400 dark:text-gray-600 text-sm">{t.noPhotos}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Template */}
            <div className="mt-5 flex flex-col gap-3">
              <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-widest">{t.templateLabel}</p>
              <div className={`relative rounded-xl p-3 flex flex-col gap-2 border-2 ${fmtStyle.border} ${fmtStyle.bg}`}>
                {renderTemplate()}
                {/* Format badge — bottom right */}
                <div className={`absolute bottom-2 ${lang === 'ar' ? 'left-2' : 'right-2'} flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${fmtStyle.badgeBg} backdrop-blur-sm`}>
                  <span className={`text-[10px] font-bold ${fmtStyle.text}`}>{fmtStyle.ratio}</span>
                  <span className={`text-[10px] font-medium ${fmtStyle.text} opacity-70`}>
                    {format === 'square' ? t.formatSquare : format === 'portrait' ? t.formatPortrait : t.formatStory}
                  </span>
                </div>
              </div>
              <p className="text-gray-400 dark:text-gray-600 text-xs text-center">{t.templateHint}</p>
            </div>

            {/* Next button */}
            <div className="flex justify-end mt-8">
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`px-8 py-3 rounded-xl font-bold text-sm transition-colors
                  ${canProceed ? 'bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500' : 'bg-stone-200 dark:bg-[#2a2a2a] text-stone-400 dark:text-gray-500 cursor-not-allowed'}
                `}
              >
                {t.btnNextCrop}
              </button>
            </div>
          </Panel>
        )}

    </div>
  )
}
