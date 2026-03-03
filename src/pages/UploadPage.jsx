import { useRef, useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { Columns2, Image } from 'lucide-react'
import { FaInstagram, FaTiktok, FaXTwitter } from 'react-icons/fa6'
import { FaSnapchatGhost } from 'react-icons/fa'
import Stagger from '../components/Stagger'
import EditableSlot from '../features/sloteditor/EditableSlot'
import InlineToolbar from '../features/sloteditor/InlineToolbar'
import EditorLayout from '../features/sloteditor/EditorLayout'
import { generateCroppedDataURL } from '../features/sloteditor/generateCroppedDataURL'
import { DEFAULT_DOCTOR_NAME } from '../constants/layout'
import { cacheGet, cacheSet } from '../utils/sessionCache'
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
    <div className="w-32 h-32 sm:w-40 sm:h-40 -my-1 sm:-my-3">
      <img src={medicalImg} alt="Medical" className="w-full h-full object-contain scale-125 dark:brightness-0 dark:invert" />
    </div>
  )
}

function IconEcommerce() {
  return (
    <div className="w-32 h-32 sm:w-40 sm:h-40 -my-1 sm:-my-3">
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
        <p className={`font-semibold text-base ${active ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{title}</p>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
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
      className={`flex flex-col items-center gap-4 p-5 rounded-xl border transition-colors duration-200 w-full
        ${selected === id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-stone-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] hover:border-stone-400 dark:hover:border-[#444] hover:bg-stone-50 dark:hover:bg-[#1f1f1f]'}
      `}
    >
      <div className="w-28 h-28 flex items-center justify-center">{children}</div>
      <span className="text-base font-semibold text-gray-700 dark:text-gray-300">{label}</span>
    </button>
  )
}

function Panel({ children, centered = true }) {
  return (
    <div className={centered ? 'flex flex-col items-center w-full max-w-[560px] mx-auto' : 'w-full'}>
      {children}
    </div>
  )
}

// ── Step header ────────────────────────────────────────────────────────────

function StepHeader({ title, desc }) {
  return (
    <div className="mb-6 text-center">
      <h2 className="text-gray-900 dark:text-white text-2xl sm:text-3xl font-bold mb-1">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{desc}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

// subStep flow:
// B&A:    'category' → 'posttype' → 'format' → 'layout' → 'upload'
// Single: 'category' → 'posttype' → 'format' → 'upload'
const SUB_STEP_PROGRESS = { category: 0.2, posttype: 0.4, format: 0.6, layout: 0.8, upload: 1.0 }

export default function UploadPage({ step, onNext, onSubProgress, onNavUpdate }) {
  const { t, lang } = useLanguage()
  const inputRef = useRef(null)
  const loaded = useRef(false)
  const [subStep, setSubStep] = useState('category')

  useEffect(() => {
    onSubProgress?.(SUB_STEP_PROGRESS[subStep] || 0)
  }, [subStep, onSubProgress])
  const [bulkDragging, setBulkDragging] = useState(false)
  const [images, setImages] = useState([])

  const [category, setCategory] = useState(null)
  const [postType, setPostType] = useState(null)
  const [layout, setLayout] = useState(null)
  const [format, setFormat] = useState(null)   // 'square' | 'portrait' | 'story'
  const [slotData, setSlotData] = useState({ before: null, after: null, single: null })
  const [generating, setGenerating] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const [watermarkText, setWatermarkText] = useState(DEFAULT_DOCTOR_NAME)
  const [selectedTemplate, setSelectedTemplate] = useState('classic')
  const [selectedImageId, setSelectedImageId] = useState(null)
  const [activeSlotKey, setActiveSlotKey] = useState(null)
  const [drawSettings, setDrawSettings] = useState({ color: '#1a3a6b', lineWidth: 3, dashed: true })
  const beforeSlotRef = useRef(null)
  const afterSlotRef = useRef(null)
  const singleSlotRef = useRef(null)

  // ── Session cache: restore on mount ─────────────────────────────────────
  useEffect(() => {
    cacheGet('upload').then((c) => {
      if (c) {
        if (c.subStep) setSubStep(c.subStep)
        if (c.images) setImages(c.images)
        if (c.category) setCategory(c.category)
        if (c.postType) setPostType(c.postType)
        if (c.layout) setLayout(c.layout)
        if (c.format) setFormat(c.format)
        if (c.slotData) {
          // Migrate cached bgColor from old 'black' default to 'white'
          const migrated = { ...c.slotData }
          for (const k of Object.keys(migrated)) {
            if (migrated[k] && migrated[k].bgColor === 'black') migrated[k] = { ...migrated[k], bgColor: 'white' }
          }
          setSlotData(migrated)
        }
        if (c.watermarkText !== undefined) setWatermarkText(c.watermarkText)
        if (c.selectedTemplate) setSelectedTemplate(c.selectedTemplate)
      }
      loaded.current = true
    }).catch(() => { loaded.current = true })
  }, [])

  // ── Session cache: save on changes (debounced) ──────────────────────────
  useEffect(() => {
    if (!loaded.current) return
    const timer = setTimeout(() => {
      cacheSet('upload', {
        subStep, images, category, postType, layout, format, slotData, watermarkText, selectedTemplate,
      }).catch(() => {})
    }, 500)
    return () => clearTimeout(timer)
  }, [subStep, images, category, postType, layout, format, slotData, watermarkText, selectedTemplate])

  // ── Derived canProceed ──────────────────────────────────────────────────
  const canProceed =
    (postType === 'beforeafter' && format && layout && slotData.before?.rawId && slotData.after?.rawId) ||
    (postType === 'single' && format && slotData.single?.rawId)

  // ── handleNext (ref'd for nav bar) ──────────────────────────────────────
  async function handleNext() {
    if (!canProceed || generating) return
    setGenerating(true)
    try {
      const beforeSlot = postType === 'beforeafter' ? slotData.before : slotData.single
      const afterSlot  = postType === 'beforeafter' ? slotData.after  : slotData.single
      const [beforeCropped, afterCropped] = await Promise.all([
        generateCroppedDataURL(beforeSlot.rawDataURL, beforeSlot),
        generateCroppedDataURL(afterSlot.rawDataURL, afterSlot),
      ])
      onNext({
        beforeCropped,
        afterCropped,
        beforeStrokes: beforeSlot.strokes || [],
        afterStrokes:  afterSlot.strokes  || [],
        layoutMode: layout || 'single',
        singleTarget: postType === 'single' ? 'single' : null,
        format,
        category,
        postType,
        watermarkText,
        bgColor: beforeSlot.bgColor || 'white',
        selectedTemplate,
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleNextRef = useRef(handleNext)
  handleNextRef.current = handleNext

  // ── Report nav state to parent NavBar ───────────────────────────────────
  useEffect(() => {
    if (step !== 1) return

    const backMap = {
      category: { label: '', fn: null },
      posttype: { label: t.step1Heading, fn: () => setSubStep('category') },
      format: { label: t.step2Heading, fn: () => setSubStep('posttype') },
      layout: { label: t.stepFormatHeading, fn: () => setSubStep('format') },
      upload: {
        label: postType === 'beforeafter' ? t.step4Heading : t.stepFormatHeading,
        fn: () => setSubStep(postType === 'beforeafter' ? 'layout' : 'format'),
      },
    }

    const back = backMap[subStep] || { label: '', fn: null }

    onNavUpdate?.({
      backLabel: back.label,
      onBack: back.fn,
      nextLabel: subStep === 'upload' ? (generating ? (t.generatingCrop || 'Generating...') : t.btnNextCompose) : '',
      onNext: subStep === 'upload' ? () => handleNextRef.current?.() : null,
      nextDisabled: !canProceed || generating,
    })
  }, [step, subStep, canProceed, generating, postType, t]) // eslint-disable-line

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
    setSlotData((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => { if (next[k]?.rawId === id) next[k] = null })
      return next
    })
  }

  function handleGalleryDragStart(e, id) {
    e.dataTransfer.setData('imageId', id)
    setSelectedImageId(null) // clear tap-selection when desktop drag starts
  }

  function handleGalleryTap(id) {
    setSelectedImageId((prev) => (prev === id ? null : id))
  }

  function handleSlotTap(slotKey) {
    if (selectedImageId) {
      dropIntoSlot(slotKey, selectedImageId)
      setSelectedImageId(null)
    }
  }

  function handleTemplateTap() {
    if (!selectedImageId) return
    const target = getFirstEmptySlot()
    if (target) {
      dropIntoSlot(target, selectedImageId)
      setSelectedImageId(null)
    }
  }

  function dropIntoSlot(slotKey, imageId) {
    if (!imageId) return
    const img = images.find((i) => i.id === imageId)
    if (!img) return
    setSlotData((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => { if (next[k]?.rawId === imageId) next[k] = null })
      const existing = next[slotKey]
      next[slotKey] = { ...DEFAULT_SLOT_STATE, bgColor: 'white', ...existing, rawId: imageId, rawDataURL: img.dataURL, scale: 1, offsetX: 0, offsetY: 0 }
      return next
    })
    setDragOver(null)
    setActiveSlotKey(slotKey)
  }

  function clearSlot(slotKey) {
    setSlotData((prev) => ({ ...prev, [slotKey]: null }))
  }

  // ── Active slot for shared toolbar ──────────────────────────────────────
  const slotRefMap = { before: beforeSlotRef, after: afterSlotRef, single: singleSlotRef }

  const DEFAULT_SLOT_STATE = { scale: 1, offsetX: 0, offsetY: 0, strokes: [], mode: 'move', bgColor: 'white' }

  const effectiveActiveSlot = (() => {
    if (activeSlotKey && slotData[activeSlotKey]) return activeSlotKey
    if (postType === 'single') return 'single'
    if (slotData.before) return 'before'
    if (slotData.after) return 'after'
    return postType === 'single' ? 'single' : 'before'
  })()

  const activeState = slotData[effectiveActiveSlot] || DEFAULT_SLOT_STATE
  const activeRef = slotRefMap[effectiveActiveSlot] || null

  const handleToolbarModeChange = useCallback((m) => {
    if (effectiveActiveSlot) updateSlotState(effectiveActiveSlot, { mode: m })
  }, [effectiveActiveSlot]) // eslint-disable-line

  const handleToolbarBgChange = useCallback((bg) => {
    if (effectiveActiveSlot) updateSlotState(effectiveActiveSlot, { bgColor: bg })
  }, [effectiveActiveSlot]) // eslint-disable-line

  function getFirstEmptySlot() {
    if (postType === 'single') return slotData.single?.rawId ? null : 'single'
    if (!slotData.before?.rawId) return 'before'
    if (!slotData.after?.rawId) return 'after'
    return null
  }

  function handleTemplateDrop(e) {
    e.preventDefault()
    const imageId = e.dataTransfer.getData('imageId')
    const target = getFirstEmptySlot()
    if (target && imageId) dropIntoSlot(target, imageId)
    setDragOver(null)
  }

  function handleTemplateDragOver(e) {
    e.preventDefault()
    const target = getFirstEmptySlot()
    if (target) setDragOver(target)
  }

  function updateSlotState(slotKey, patch) {
    setSlotData((prev) => ({
      ...prev,
      [slotKey]: { ...(prev[slotKey] || DEFAULT_SLOT_STATE), ...patch },
    }))
  }

  // ── Navigation helpers ───────────────────────────────────────────────────

  function pickCategory(cat) {
    setCategory(cat)
    setPostType(null)
    setLayout(null)
    setFormat(null)
    setSlotData({ before: null, after: null, single: null })
    setSubStep('posttype')
  }

  function pickPostType(type) {
    setPostType(type)
    setLayout(null)
    setFormat(null)
    setSlotData({ before: null, after: null, single: null })
    setSubStep('format')
  }

  function pickFormat(f) {
    setFormat(f)
    setSlotData({ before: null, after: null, single: null })
    // B&A needs a layout step next; single goes straight to upload
    setSubStep(postType === 'beforeafter' ? 'layout' : 'upload')
  }

  function pickLayout(l) {
    setLayout(l)
    setSlotData({ before: null, after: null, single: null })
    setSubStep('upload')
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  // Build slot image objects for rendering (show cropped if available, else raw)
  const slotImages = {
    before: slotData.before?.rawId ? { id: slotData.before.rawId, dataURL: slotData.before.rawDataURL } : null,
    after:  slotData.after?.rawId  ? { id: slotData.after.rawId,  dataURL: slotData.after.rawDataURL }  : null,
    single: slotData.single?.rawId ? { id: slotData.single.rawId, dataURL: slotData.single.rawDataURL } : null,
  }

  // Aspect ratio helpers based on format
  const FORMAT_RATIOS = { square: '1/1', portrait: '4/5', story: '9/16' }
  const templateRatio = FORMAT_RATIOS[format] || '1/1'

  // Format visual style map (matches the format selection cards)
  const FORMAT_STYLES = {
    square:   { ratio: '1:1', border: 'border-stone-200 dark:border-[#2a2a2a]', bg: '', text: 'text-gray-400 dark:text-gray-500', badgeBg: '' },
    portrait: { ratio: '4:5', border: 'border-stone-200 dark:border-[#2a2a2a]', bg: '', text: 'text-gray-400 dark:text-gray-500', badgeBg: '' },
    story:    { ratio: '9:16', border: 'border-stone-200 dark:border-[#2a2a2a]', bg: '', text: 'text-gray-400 dark:text-gray-500', badgeBg: '' },
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
      slotState: slotData[key],
      isDragOver: dragOver === key,
      onDragOver: () => setDragOver(key),
      onDragLeave: () => setDragOver(null),
      onDrop: (id) => dropIntoSlot(key, id),
      onClear: () => clearSlot(key),
      onSlotStateChange: (patch) => updateSlotState(key, patch),
      dragHint: selectedImageId ? t.slotTapHint : t.slotDragHint,
      onTapPlace: () => handleSlotTap(key),
      isSelected: !!selectedImageId,
      hideToolbar: true,
      onActivate: () => setActiveSlotKey(key),
      selectedTemplate,
      watermarkText,
      slotKey: key,
      drawSettings,
    })

    // Watermark overlay — positioned over the template container at the center divider
    const watermarkOverlay = selectedTemplate !== 'clean' && watermarkText && slotData.before?.rawId && slotData.after?.rawId ? (
      <div className="absolute inset-0 pointer-events-none z-[2] flex items-center justify-center">
        {selectedTemplate === 'classic' && (
          <div className="px-4 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-[0.15em]">
            {watermarkText}
          </div>
        )}
        {selectedTemplate === 'elegant' && (
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-px bg-white/25" />
            <div className="text-white/50 text-[8px] font-semibold uppercase tracking-[0.2em]">
              {watermarkText}
            </div>
          </div>
        )}
      </div>
    ) : null

    if (postType === 'beforeafter') {
      if (layout === 'stacked') return (
        <div className="relative flex flex-col w-full" style={{ aspectRatio: templateRatio }}>
          <EditableSlot ref={beforeSlotRef} {...slotProps('before', 'orange')} aspectRatio="auto" roundedClass="rounded-t-xl" />
          <EditableSlot ref={afterSlotRef} {...slotProps('after', 'green')} aspectRatio="auto" roundedClass="rounded-b-xl" />
          {watermarkOverlay}
        </div>
      )
      if (layout === 'sidebyside') return (
        <div className="relative flex flex-row w-full" style={{ aspectRatio: templateRatio }}>
          <EditableSlot ref={beforeSlotRef} {...slotProps('before', 'orange')} aspectRatio="auto" roundedClass="rounded-l-xl" />
          <EditableSlot ref={afterSlotRef} {...slotProps('after', 'green')} aspectRatio="auto" roundedClass="rounded-r-xl" />
          {watermarkOverlay}
        </div>
      )
      return null
    }
    if (postType === 'single' && format) return (
      <EditableSlot ref={singleSlotRef} {...slotProps('single', 'green')} aspectRatio={templateRatio} roundedClass="rounded-xl" />
    )
    return null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`w-full ${subStep === 'upload' ? 'flex-1 flex flex-col min-h-0' : 'px-4 pb-6 pt-6 flex flex-col flex-1'}`}>
      <Stagger key={subStep} gap={70} start={30} getClassName={() => subStep === 'upload' ? 'flex-1 flex flex-col min-h-0' : ''}>

        {/* ── STEP: Category ─────────────────────────────────────────── */}
        {subStep === 'category' && (
          <Panel key="category">
            <StepHeader
              title={t.step1Heading}
              desc={t.step1Desc}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[520px] mx-auto">
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
            <StepHeader
              title={t.step2Heading}
              desc={t.step2Desc}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[520px] mx-auto">
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
            <StepHeader
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
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-20 h-20 rounded-lg border border-blue-400 bg-blue-500/10 flex items-center justify-center">
                      <span className="text-blue-500 text-sm font-bold">1:1</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaInstagram className="w-4 h-4 text-pink-500" />
                      <FaXTwitter className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
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
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-20 rounded-lg border border-purple-400 bg-purple-500/10 flex items-center justify-center">
                      <span className="text-purple-500 text-sm font-bold">4:5</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaInstagram className="w-4 h-4 text-pink-500" />
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
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-[45px] h-20 rounded-lg border border-pink-400 bg-pink-500/10 flex items-center justify-center">
                      <span className="text-pink-500 text-xs font-bold">9:16</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FaInstagram className="w-4 h-4 text-pink-500" />
                      <FaTiktok className="w-3.5 h-3.5 text-gray-800 dark:text-gray-200" />
                      <FaSnapchatGhost className="w-4 h-4 text-yellow-400" />
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
            <StepHeader
              title={t.step4Heading}
              desc={t.step4Desc}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[520px] mx-auto">
              <LayoutCard id="stacked" selected={layout} onClick={pickLayout} label={t.layoutStacked}>
                <div className="w-28 h-28 rounded-lg border border-stone-300 dark:border-[#3a3a3a] overflow-hidden flex flex-col">
                  <div className="flex-1 bg-orange-500/20 border-b border-stone-300 dark:border-[#3a3a3a] flex items-center justify-center">
                    <span className="text-orange-500 text-[10px] font-bold">{t.slotBefore}</span>
                  </div>
                  <div className="flex-1 bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-[10px] font-bold">{t.slotAfter}</span>
                  </div>
                </div>
              </LayoutCard>
              <LayoutCard id="sidebyside" selected={layout} onClick={pickLayout} label={t.layoutSideBySide}>
                <div className="w-28 h-28 rounded-lg border border-stone-300 dark:border-[#3a3a3a] overflow-hidden flex flex-row">
                  <div className="flex-1 bg-orange-500/20 border-e border-stone-300 dark:border-[#3a3a3a] flex items-center justify-center">
                    <span className="text-orange-500 text-[10px] font-bold">{t.slotBefore}</span>
                  </div>
                  <div className="flex-1 bg-green-500/20 flex items-center justify-center">
                    <span className="text-green-500 text-[10px] font-bold">{t.slotAfter}</span>
                  </div>
                </div>
              </LayoutCard>
            </div>
          </Panel>
        )}

        {/* ── STEP 4/5: Upload / Gallery / Template (Canva-style) ── */}
        {subStep === 'upload' && (
          <EditorLayout
            images={images}
            slotData={slotData}
            selectedImageId={selectedImageId}
            selectedTemplate={selectedTemplate}
            watermarkText={watermarkText}
            format={format}
            bulkDragging={bulkDragging}
            dragOver={dragOver}
            lang={lang}
            effectiveActiveSlot={effectiveActiveSlot}
            activeState={activeState}
            activeRef={activeRef}
            inputRef={inputRef}
            beforeSlotRef={beforeSlotRef}
            afterSlotRef={afterSlotRef}
            singleSlotRef={singleSlotRef}
            onFileInput={handleFileInput}
            onBulkDrop={handleBulkDrop}
            setBulkDragging={setBulkDragging}
            onRemoveImage={removeImage}
            onGalleryDragStart={handleGalleryDragStart}
            onGalleryTap={handleGalleryTap}
            onTemplateTap={handleTemplateTap}
            onTemplateDrop={handleTemplateDrop}
            onTemplateDragOver={handleTemplateDragOver}
            onSetDragOver={setDragOver}
            onToolbarModeChange={handleToolbarModeChange}
            onToolbarBgChange={handleToolbarBgChange}
            drawSettings={drawSettings}
            onDrawSettingsChange={setDrawSettings}
            onTemplateChange={setSelectedTemplate}
            onWatermarkChange={setWatermarkText}
            renderTemplate={renderTemplate}
            fmtStyle={fmtStyle}
            templateRatio={templateRatio}
          />
        )}

      </Stagger>
    </div>
  )
}
