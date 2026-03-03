import { useRef, useState, useEffect, useCallback, createRef } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { Columns2, Image, Copy, Plus, Minus } from 'lucide-react'
import { FaInstagram, FaTiktok, FaXTwitter } from 'react-icons/fa6'
import { FaSnapchatGhost } from 'react-icons/fa'
import Stagger from '../components/Stagger'
import EditableSlot from '../features/sloteditor/EditableSlot'
import EditorLayout from '../features/sloteditor/EditorLayout'
import { generateCroppedDataURL } from '../features/sloteditor/generateCroppedDataURL'
import { DEFAULT_DOCTOR_NAME } from '../constants/layout'
import { getTemplateLabelStrokes } from '../features/compose/templateStrokes'
import { cacheGet, cacheSet } from '../utils/sessionCache'
import { mapAIOverlaysToStrokes } from '../utils/aiTextOverlayMapper'
import { EMPTY_POST } from '../App'

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

const FORMAT_RATIOS = { square: '1/1', portrait: '4/5', story: '9/16' }

const DEFAULT_SLOT_STATE = { scale: 1, offsetX: 0, offsetY: 0, strokes: [], mode: 'move', bgColor: 'white' }

function createEmptySlotData() {
  return { before: null, after: null, single: null }
}

// ── Icons ──────────────────────────────────────────────────────────────────

function IconCircle({ children, bg, ring }) {
  return (
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${bg} ring-1 ${ring}`}>
      {children}
    </div>
  )
}

function IconBeforeAfter({ small } = {}) {
  const sz = small ? 'w-5 h-5' : 'w-7 h-7'
  return (
    <IconCircle bg="bg-indigo-100 dark:bg-indigo-900/30" ring="ring-indigo-200 dark:ring-indigo-800">
      <Columns2 className={`${sz} text-indigo-600 dark:text-indigo-400`} strokeWidth={1.75} />
    </IconCircle>
  )
}

function IconSinglePhoto({ small } = {}) {
  const sz = small ? 'w-5 h-5' : 'w-7 h-7'
  return (
    <IconCircle bg="bg-teal-100 dark:bg-teal-900/30" ring="ring-teal-200 dark:ring-teal-800">
      <Image className={`${sz} text-teal-600 dark:text-teal-400`} strokeWidth={1.75} />
    </IconCircle>
  )
}

function IconMultiplePosts() {
  return (
    <IconCircle bg="bg-purple-100 dark:bg-purple-900/30" ring="ring-purple-200 dark:ring-purple-800">
      <Copy className="w-7 h-7 text-purple-600 dark:text-purple-400" strokeWidth={1.75} />
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

// ── Pill button for configure step ─────────────────────────────────────────

function PillGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
            ${value === opt.value
              ? 'bg-blue-600 text-white'
              : 'bg-stone-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-[#252525] border border-stone-200 dark:border-[#2a2a2a]'}
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Format selector with visual ratio illustrations ───────────────────────

const FORMAT_OPTIONS = [
  { value: 'square',   ratio: '1:1',  w: 16, h: 16, color: 'blue' },
  { value: 'portrait', ratio: '4:5',  w: 16, h: 20, color: 'violet' },
  { value: 'story',    ratio: '9:16', w: 14, h: 25, color: 'amber' },
]

const FORMAT_COLORS = {
  blue:   { active: 'bg-blue-600 text-white', border: 'border-white/60', ratio: 'text-blue-200' },
  violet: { active: 'bg-violet-600 text-white', border: 'border-white/60', ratio: 'text-violet-200' },
  amber:  { active: 'bg-amber-600 text-white', border: 'border-white/60', ratio: 'text-amber-200' },
}

function FormatSelector({ value, onChange, t }) {
  const labels = { square: t.formatSquare, portrait: t.formatPortrait, story: t.formatStory }
  return (
    <div className="flex gap-1.5">
      {FORMAT_OPTIONS.map((opt) => {
        const active = value === opt.value
        const colors = FORMAT_COLORS[opt.color]
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              ${active
                ? colors.active
                : 'bg-stone-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 hover:bg-stone-200 dark:hover:bg-[#252525] border border-stone-200 dark:border-[#2a2a2a]'}
            `}
          >
            <div
              className={`rounded-[2px] ${active ? `border-[1.5px] ${colors.border}` : 'border-[1.5px] border-gray-300 dark:border-gray-600'}`}
              style={{ width: opt.w, height: opt.h }}
            />
            <span>{labels[opt.value]}</span>
            <span className={`text-[10px] ${active ? colors.ratio : 'text-gray-400 dark:text-gray-500'}`}>{opt.ratio}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

// subStep flow:
// postmode → count (if multiple) → configure → upload
const SUB_STEP_PROGRESS = { postmode: 0.20, count: 0.40, configure: 0.60, upload: 1.0 }

export default function UploadPage({ step, initialPosts, initialMultiMode, onNext, onSubProgress, onNavUpdate }) {
  const { t, lang } = useLanguage()
  const inputRef = useRef(null)
  const loaded = useRef(false)
  const [subStep, setSubStep] = useState('postmode')

  useEffect(() => {
    onSubProgress?.(SUB_STEP_PROGRESS[subStep] || 0)
  }, [subStep, onSubProgress])
  const [bulkDragging, setBulkDragging] = useState(false)
  const [images, setImages] = useState([])

  const category = null // category step removed
  const [multiMode, setMultiMode] = useState(initialMultiMode || 'single')
  const [postCount, setPostCount] = useState(2) // for count step
  const [posts, setPosts] = useState(initialPosts || [{ ...EMPTY_POST, id: 'post-0' }])

  // Per-post slotData: { [postId]: { before: null, after: null, single: null } }
  const [slotData, setSlotData] = useState({})

  const [generating, setGenerating] = useState(false)
  const [dragOver, setDragOver] = useState(null)
  const [watermarkText, setWatermarkText] = useState(DEFAULT_DOCTOR_NAME)
  const [selectedTemplate, setSelectedTemplate] = useState('classic')
  const [selectedImageId, setSelectedImageId] = useState(null)
  const [activePostId, setActivePostId] = useState(null)
  const [activeSlotKey, setActiveSlotKey] = useState(null)
  const [drawSettings, setDrawSettings] = useState({ color: '#1a3a6b', lineWidth: 3, dashed: true })
  const pendingAIOverlaysRef = useRef(null)

  // Per-post slot refs: { [postId]: { before: ref, after: ref, single: ref } }
  const slotRefsMap = useRef({})
  function getSlotRef(postId, slotKey) {
    if (!slotRefsMap.current[postId]) {
      slotRefsMap.current[postId] = { before: createRef(), after: createRef(), single: createRef() }
    }
    return slotRefsMap.current[postId][slotKey]
  }

  // ── Derived: active post ────────────────────────────────────────────────
  const activePost = posts.find((p) => p.id === activePostId) || posts[0] || null
  const activePostSlotData = activePost ? (slotData[activePost.id] || createEmptySlotData()) : createEmptySlotData()

  // ── Session cache: restore on mount ─────────────────────────────────────
  useEffect(() => {
    cacheGet('upload').then((c) => {
      if (c) {
        if (c.subStep) setSubStep(c.subStep === 'category' ? 'postmode' : c.subStep)
        if (c.images) setImages(c.images)
        if (c.category) setCategory(c.category)
        if (c.multiMode) setMultiMode(c.multiMode)
        if (c.postCount) setPostCount(c.postCount)
        if (c.posts) setPosts(c.posts)
        if (c.slotData) {
          // Migrate cached bgColor from old 'black' default to 'white'
          const migrated = { ...c.slotData }
          for (const pid of Object.keys(migrated)) {
            if (migrated[pid]) {
              const postSlots = { ...migrated[pid] }
              for (const k of Object.keys(postSlots)) {
                if (postSlots[k] && postSlots[k].bgColor === 'black') postSlots[k] = { ...postSlots[k], bgColor: 'white' }
              }
              migrated[pid] = postSlots
            }
          }
          setSlotData(migrated)
        }
        if (c.watermarkText !== undefined) setWatermarkText(c.watermarkText)
        if (c.selectedTemplate) setSelectedTemplate(c.selectedTemplate)
        if (c.activePostId) setActivePostId(c.activePostId)
      }
      loaded.current = true
    }).catch(() => { loaded.current = true })
  }, [])

  // ── Session cache: save on changes (debounced) ──────────────────────────
  useEffect(() => {
    if (!loaded.current) return
    const timer = setTimeout(() => {
      cacheSet('upload', {
        subStep, images, multiMode, postCount, posts, slotData,
        watermarkText, selectedTemplate, activePostId,
      }).catch(() => {})
    }, 500)
    return () => clearTimeout(timer)
  }, [subStep, images, multiMode, postCount, posts, slotData, watermarkText, selectedTemplate, activePostId])

  // ── Reactively inject template strokes when slots or template change ──
  const prevTemplateRef = useRef(undefined)
  const prevSlotsRef = useRef({})
  useEffect(() => {
    const tplChanged = prevTemplateRef.current !== selectedTemplate

    for (const post of posts) {
      const pd = slotData[post.id]
      if (!pd) continue
      const prev = prevSlotsRef.current[post.id] || {}
      const slotsChanged = (
        prev.before !== (pd.before?.rawId || null) ||
        prev.after !== (pd.after?.rawId || null) ||
        prev.single !== (pd.single?.rawId || null)
      )

      if (tplChanged || slotsChanged) {
        const refs = slotRefsMap.current[post.id]
        if (!refs) continue

        if (post.postType === 'beforeafter') {
          if (pd.before?.rawId) {
            refs.before.current?.replaceTemplateStrokes(getStrokesForSlot(selectedTemplate, 'before', post))
          } else {
            refs.before.current?.removeTemplateStrokes()
          }
          if (pd.after?.rawId) {
            refs.after.current?.replaceTemplateStrokes(getStrokesForSlot(selectedTemplate, 'after', post))
          } else {
            refs.after.current?.removeTemplateStrokes()
          }
        } else if (post.postType === 'single') {
          if (pd.single?.rawId) {
            refs.single.current?.replaceTemplateStrokes(getStrokesForSlot(selectedTemplate, 'single', post))
          } else {
            refs.single.current?.removeTemplateStrokes()
          }
        }
      }
    }

    prevTemplateRef.current = selectedTemplate
    const newPrevSlots = {}
    for (const post of posts) {
      const pd = slotData[post.id]
      newPrevSlots[post.id] = {
        before: pd?.before?.rawId || null,
        after: pd?.after?.rawId || null,
        single: pd?.single?.rawId || null,
      }
    }
    prevSlotsRef.current = newPrevSlots
  })

  // ── Inject AI text overlays once the slot ref is ready ─────────────────
  useEffect(() => {
    if (!pendingAIOverlaysRef.current) return
    const { postId, target, overlays } = pendingAIOverlaysRef.current
    const refs = slotRefsMap.current[postId]
    const pd = slotData[postId]
    if (refs?.[target]?.current && pd?.[target]?.rawId) {
      overlays.forEach((stroke) => refs[target].current.addTextStroke(stroke))
      pendingAIOverlaysRef.current = null
    }
  })

  // ── Derived canProceed (all posts must have slots filled) ──────────────
  const canProceed = posts.every((post) => {
    const pd = slotData[post.id]
    if (!pd) return false
    if (post.postType === 'beforeafter') {
      return post.format && post.layoutMode && pd.before?.rawId && pd.after?.rawId
    }
    if (post.postType === 'single') {
      return post.format && pd.single?.rawId
    }
    return false
  })

  // ── handleNext (ref'd for nav bar) ──────────────────────────────────────
  async function handleNext() {
    if (!canProceed || generating) return
    setGenerating(true)
    try {
      const composedPosts = await Promise.all(
        posts.map(async (post) => {
          const pd = slotData[post.id]
          const beforeSlot = post.postType === 'beforeafter' ? pd.before : pd.single
          const afterSlot  = post.postType === 'beforeafter' ? pd.after  : pd.single
          const [beforeCropped, afterCropped] = await Promise.all([
            generateCroppedDataURL(beforeSlot.rawDataURL, beforeSlot),
            generateCroppedDataURL(afterSlot.rawDataURL, afterSlot),
          ])
          return {
            ...post,
            beforeCropped,
            afterCropped,
            beforeStrokes: beforeSlot.strokes || [],
            afterStrokes:  afterSlot.strokes  || [],
            singleTarget: post.postType === 'single' ? 'single' : null,
            watermarkText,
            bgColor: beforeSlot.bgColor || 'white',
            selectedTemplate,
          }
        })
      )
      onNext({ posts: composedPosts, multiMode })
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
      postmode: { label: '', fn: null },
      count: { label: t.step2Heading, fn: () => setSubStep('postmode') },
      configure: {
        label: multiMode === 'multiple' ? t.countHeading : t.step2Heading,
        fn: () => setSubStep(multiMode === 'multiple' ? 'count' : 'postmode'),
      },
      upload: {
        label: t.configureHeading,
        fn: () => setSubStep('configure'),
      },
    }

    const back = backMap[subStep] || { label: '', fn: null }

    let nextLabel = ''
    let onNext = null
    let nextDisabled = false

    if (subStep === 'upload') {
      nextLabel = generating ? (t.generatingCrop || 'Generating...') : t.btnNextCompose
      onNext = () => handleNextRef.current?.()
      nextDisabled = !canProceed || generating
    } else if (subStep === 'configure') {
      nextLabel = t.btnNextCompose || 'Continue'
      onNext = () => confirmConfigure()
      nextDisabled = !allPostsConfigured()
    } else if (subStep === 'count') {
      nextLabel = t.btnNextCompose || 'Continue'
      onNext = () => confirmCount()
      nextDisabled = false
    }

    onNavUpdate?.({
      backLabel: back.label,
      onBack: back.fn,
      nextLabel,
      onNext,
      nextDisabled,
    })
  }, [step, subStep, canProceed, generating, multiMode, posts, t]) // eslint-disable-line

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
    // Clear from all posts' slotData
    setSlotData((prev) => {
      const next = { ...prev }
      for (const pid of Object.keys(next)) {
        if (!next[pid]) continue
        const postSlots = { ...next[pid] }
        let changed = false
        for (const k of Object.keys(postSlots)) {
          if (postSlots[k]?.rawId === id) { postSlots[k] = null; changed = true }
        }
        if (changed) next[pid] = postSlots
      }
      return next
    })
  }

  function handleGalleryDragStart(e, id) {
    e.dataTransfer.setData('imageId', id)
    setSelectedImageId(null)
  }

  function handleGalleryTap(id) {
    setSelectedImageId((prev) => (prev === id ? null : id))
  }

  function handleSlotTap(postId, slotKey) {
    if (selectedImageId) {
      dropIntoSlot(postId, slotKey, selectedImageId)
      setSelectedImageId(null)
    }
  }

  function handleTemplateTap() {
    if (!selectedImageId || !activePost) return
    const target = getFirstEmptySlot(activePost)
    if (target) {
      dropIntoSlot(activePost.id, target, selectedImageId)
      setSelectedImageId(null)
    }
  }

  function getStrokesForSlot(templateId, slotKey, post) {
    const labelText = slotKey === 'before' ? t.slotBefore : slotKey === 'after' ? t.slotAfter : ''
    const effectiveLayout = post.postType === 'single' ? 'single' : post.layoutMode
    return getTemplateLabelStrokes(templateId, slotKey, labelText, watermarkText, effectiveLayout)
  }

  function dropIntoSlot(postId, slotKey, imageId) {
    if (!imageId) return
    const img = images.find((i) => i.id === imageId)
    if (!img) return
    setSlotData((prev) => {
      const postSlots = { ...(prev[postId] || createEmptySlotData()) }
      // Remove image from any slot in this post
      Object.keys(postSlots).forEach((k) => { if (postSlots[k]?.rawId === imageId) postSlots[k] = null })
      const existing = postSlots[slotKey]
      postSlots[slotKey] = { ...DEFAULT_SLOT_STATE, bgColor: 'white', ...existing, rawId: imageId, rawDataURL: img.dataURL, scale: 1, offsetX: 0, offsetY: 0 }
      return { ...prev, [postId]: postSlots }
    })
    setDragOver(null)
    setActivePostId(postId)
    setActiveSlotKey(slotKey)
  }

  function clearSlot(postId, slotKey) {
    setSlotData((prev) => ({
      ...prev,
      [postId]: { ...(prev[postId] || createEmptySlotData()), [slotKey]: null },
    }))
  }

  function updateSlotState(postId, slotKey, patch) {
    setSlotData((prev) => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || createEmptySlotData()),
        [slotKey]: { ...((prev[postId] || {})[slotKey] || DEFAULT_SLOT_STATE), ...patch },
      },
    }))
  }

  // ── Active slot for shared toolbar ──────────────────────────────────────
  const effectiveActiveSlot = (() => {
    if (!activePost) return 'before'
    const pd = slotData[activePost.id] || createEmptySlotData()
    if (activeSlotKey && pd[activeSlotKey]) return activeSlotKey
    if (activePost.postType === 'single') return 'single'
    if (pd.before) return 'before'
    if (pd.after) return 'after'
    return activePost.postType === 'single' ? 'single' : 'before'
  })()

  const activeState = activePost ? ((slotData[activePost.id] || {})[effectiveActiveSlot] || DEFAULT_SLOT_STATE) : DEFAULT_SLOT_STATE
  const activeRef = activePost ? getSlotRef(activePost.id, effectiveActiveSlot) : null

  const handleToolbarModeChange = useCallback((m) => {
    if (activePost && effectiveActiveSlot) updateSlotState(activePost.id, effectiveActiveSlot, { mode: m })
  }, [activePost?.id, effectiveActiveSlot]) // eslint-disable-line

  const handleToolbarBgChange = useCallback((bg) => {
    if (activePost && effectiveActiveSlot) updateSlotState(activePost.id, effectiveActiveSlot, { bgColor: bg })
  }, [activePost?.id, effectiveActiveSlot]) // eslint-disable-line

  function handleTemplateChange(newTemplateId) {
    setSelectedTemplate(newTemplateId)
  }

  function getFirstEmptySlot(post) {
    if (!post) return null
    const pd = slotData[post.id] || createEmptySlotData()
    if (post.postType === 'single') return pd.single?.rawId ? null : 'single'
    if (!pd.before?.rawId) return 'before'
    if (!pd.after?.rawId) return 'after'
    return null
  }

  function handleAIImageGenerated(dataURL, textOverlays = []) {
    if (!dataURL || !activePost) return
    const id = `ai-${Date.now()}`
    const newImg = { id, name: 'AI Generated', dataURL }
    setImages((prev) => [...prev, newImg])
    const pd = slotData[activePost.id] || createEmptySlotData()
    const target = effectiveActiveSlot && !pd[effectiveActiveSlot]?.rawId
      ? effectiveActiveSlot
      : getFirstEmptySlot(activePost) || effectiveActiveSlot
    if (target) {
      setSlotData((prev) => {
        const postSlots = { ...(prev[activePost.id] || createEmptySlotData()) }
        postSlots[target] = { ...DEFAULT_SLOT_STATE, bgColor: 'white', rawId: id, rawDataURL: dataURL, scale: 1, offsetX: 0, offsetY: 0 }
        return { ...prev, [activePost.id]: postSlots }
      })
      setActiveSlotKey(target)
      if (textOverlays.length > 0) {
        pendingAIOverlaysRef.current = { postId: activePost.id, target, overlays: mapAIOverlaysToStrokes(textOverlays) }
      }
    }
  }

  // Place AI image into a specific post's slot — replaces existing image if slot is occupied
  function handleAIImageForPost(postId, dataURL, textOverlays = []) {
    if (!dataURL || !postId) return
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    const id = `ai-${Date.now()}-${postId}`
    const newImg = { id, name: 'AI Generated', dataURL }
    setImages((prev) => [...prev, newImg])
    // Try empty slot first; if none, replace the first occupied slot (single→'single', B&A→'before')
    const target = getFirstEmptySlot(post)
      || (post.postType === 'single' ? 'single' : 'before')
    setSlotData((prev) => {
      const postSlots = { ...(prev[postId] || createEmptySlotData()) }
      postSlots[target] = { ...DEFAULT_SLOT_STATE, bgColor: 'white', rawId: id, rawDataURL: dataURL, scale: 1, offsetX: 0, offsetY: 0 }
      return { ...prev, [postId]: postSlots }
    })
    if (textOverlays.length > 0) {
      pendingAIOverlaysRef.current = { postId, target, overlays: mapAIOverlaysToStrokes(textOverlays) }
    }
  }

  function handleTemplateDrop(e) {
    e.preventDefault()
    if (!activePost) return
    const imageId = e.dataTransfer.getData('imageId')
    const target = getFirstEmptySlot(activePost)
    if (target && imageId) dropIntoSlot(activePost.id, target, imageId)
    setDragOver(null)
  }

  function handleTemplateDragOver(e) {
    e.preventDefault()
    if (!activePost) return
    const target = getFirstEmptySlot(activePost)
    if (target) setDragOver(`${activePost.id}-${target}`)
  }

  // ── Navigation helpers ───────────────────────────────────────────────────

  function pickPostMode(mode) {
    setMultiMode(mode)
    if (mode === 'single') {
      const newPosts = [{ ...EMPTY_POST, id: 'post-0' }]
      setPosts(newPosts)
      setSlotData({})
      setSubStep('configure')
    } else {
      setSubStep('count')
    }
  }

  function confirmCount() {
    const newPosts = Array.from({ length: postCount }, (_, i) => ({ ...EMPTY_POST, id: `post-${i}` }))
    setPosts(newPosts)
    setSlotData({})
    setActivePostId(newPosts[0].id)
    setSubStep('configure')
  }

  function updatePostConfig(postId, patch) {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, ...patch } : p))
  }

  function allPostsConfigured() {
    return posts.every((p) => {
      if (!p.postType || !p.format) return false
      if (p.postType === 'beforeafter' && !p.layoutMode) return false
      return true
    })
  }

  function confirmConfigure() {
    // Initialize slotData for all posts
    setSlotData((prev) => {
      const next = { ...prev }
      for (const p of posts) {
        if (!next[p.id]) next[p.id] = createEmptySlotData()
      }
      return next
    })
    setActivePostId(posts[0]?.id || null)
    setSubStep('upload')
  }

  // ── Render template for a specific post ─────────────────────────────────

  function renderTemplateForPost(post) {
    const pd = slotData[post.id] || createEmptySlotData()
    const templateRatio = FORMAT_RATIOS[post.format] || '1/1'
    const isActive = activePost?.id === post.id

    const slotProps = (slotKey, color) => ({
      label: slotKey === 'single' ? t.slotPhoto : slotKey === 'before' ? t.slotBefore : t.slotAfter,
      color,
      image: pd[slotKey]?.rawId ? { id: pd[slotKey].rawId, dataURL: pd[slotKey].rawDataURL } : null,
      slotState: pd[slotKey],
      isDragOver: dragOver === `${post.id}-${slotKey}`,
      onDragOver: () => setDragOver(`${post.id}-${slotKey}`),
      onDragLeave: () => setDragOver(null),
      onDrop: (id) => dropIntoSlot(post.id, slotKey, id),
      onClear: () => clearSlot(post.id, slotKey),
      onSlotStateChange: (patch) => updateSlotState(post.id, slotKey, patch),
      dragHint: selectedImageId ? t.slotTapHint : t.slotDragHint,
      onTapPlace: () => handleSlotTap(post.id, slotKey),
      isSelected: !!selectedImageId,
      hideToolbar: true,
      onActivate: () => { setActivePostId(post.id); setActiveSlotKey(slotKey) },
      selectedTemplate,
      watermarkText,
      slotKey,
      drawSettings,
    })

    if (post.postType === 'beforeafter') {
      if (post.layoutMode === 'stacked') return (
        <div className="relative flex flex-col w-full overflow-hidden" style={{ aspectRatio: templateRatio }}>
          <EditableSlot ref={getSlotRef(post.id, 'before')} {...slotProps('before', 'orange')} aspectRatio="auto" roundedClass={posts.length === 1 ? 'rounded-t-xl' : 'rounded-t-lg'} />
          <EditableSlot ref={getSlotRef(post.id, 'after')} {...slotProps('after', 'green')} aspectRatio="auto" roundedClass={posts.length === 1 ? 'rounded-b-xl' : 'rounded-b-lg'} />
        </div>
      )
      if (post.layoutMode === 'sidebyside') return (
        <div className="relative flex flex-row w-full overflow-hidden" style={{ aspectRatio: templateRatio }}>
          <EditableSlot ref={getSlotRef(post.id, 'before')} {...slotProps('before', 'orange')} aspectRatio="auto" roundedClass={posts.length === 1 ? 'rounded-l-xl' : 'rounded-l-lg'} />
          <EditableSlot ref={getSlotRef(post.id, 'after')} {...slotProps('after', 'green')} aspectRatio="auto" roundedClass={posts.length === 1 ? 'rounded-r-xl' : 'rounded-r-lg'} />
        </div>
      )
      return null
    }
    if (post.postType === 'single' && post.format) return (
      <EditableSlot ref={getSlotRef(post.id, 'single')} {...slotProps('single', 'green')} aspectRatio={templateRatio} roundedClass={posts.length === 1 ? 'rounded-xl' : 'rounded-lg'} />
    )
    return null
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`w-full ${subStep === 'upload' ? 'flex-1 flex flex-col min-h-0' : 'px-4 pb-6 pt-6 flex flex-col flex-1'}`}>
      <Stagger key={subStep} gap={70} start={30} getClassName={() => subStep === 'upload' ? 'flex-1 flex flex-col min-h-0' : ''}>

        {/* ── STEP: Post Mode (single vs multiple) ────────────────────── */}
        {subStep === 'postmode' && (
          <Panel key="postmode">
            <StepHeader
              title={t.step2Heading}
              desc={t.step2Desc}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[520px] mx-auto">
              <SelectionCard
                active={false}
                onClick={() => pickPostMode('single')}
                icon={<IconSinglePhoto />}
                title={t.postModeSingle}
                subtitle={t.postModeSingleSub}
              />
              <SelectionCard
                active={false}
                onClick={() => pickPostMode('multiple')}
                icon={<IconMultiplePosts />}
                title={t.postModeMultiple}
                subtitle={t.postModeMultipleSub}
              />
            </div>
          </Panel>
        )}

        {/* ── STEP: Count ──────────────────────────────────────────────── */}
        {subStep === 'count' && (
          <Panel key="count">
            <StepHeader
              title={t.countHeading}
              desc={t.countDesc}
            />
            <div className="flex flex-col items-center gap-6 w-full max-w-[320px] mx-auto">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setPostCount((c) => Math.max(2, c - 1))}
                  className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] flex items-center justify-center hover:bg-stone-200 dark:hover:bg-[#252525] transition-colors"
                >
                  <Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="text-5xl font-bold text-gray-900 dark:text-white w-20 text-center tabular-nums">
                  {postCount}
                </div>
                <button
                  onClick={() => setPostCount((c) => c + 1)}
                  className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-[#1a1a1a] border border-stone-200 dark:border-[#2a2a2a] flex items-center justify-center hover:bg-stone-200 dark:hover:bg-[#252525] transition-colors"
                >
                  <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </Panel>
        )}

        {/* ── STEP: Configure posts ─────────────────────────────────────── */}
        {subStep === 'configure' && (
          <Panel key="configure" centered={false}>
            <div className="flex flex-col items-center w-full">
              <StepHeader
                title={multiMode === 'multiple' ? t.configureHeading : t.configureHeading}
                desc={multiMode === 'multiple' ? t.configureDesc : t.configureSingleDesc}
              />
            </div>
            <div className={`grid gap-5 w-full mx-auto px-6 ${posts.length > 1 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl' : 'max-w-[560px] grid-cols-1'}`}>
              {posts.map((post, idx) => (
                <div key={post.id} className="border border-stone-200 dark:border-[#2a2a2a] rounded-xl p-4 bg-white dark:bg-[#1a1a1a]">
                  {posts.length > 1 && (
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      {t.configurePostLabel(idx + 1)}
                    </p>
                  )}

                  {/* Post Type */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t.configurePostType}</p>
                    <PillGroup
                      options={[
                        { value: 'single', label: t.postTypeSingle },
                        { value: 'beforeafter', label: t.postTypeBA },
                      ]}
                      value={post.postType}
                      onChange={(v) => updatePostConfig(post.id, {
                        postType: v,
                        layoutMode: v === 'single' ? 'single' : 'stacked',
                      })}
                    />
                  </div>

                  {/* Format */}
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t.configureFormat}</p>
                    <FormatSelector
                      value={post.format}
                      onChange={(v) => updatePostConfig(post.id, { format: v })}
                      t={t}
                    />
                  </div>

                  {/* Layout (B&A only) */}
                  {post.postType === 'beforeafter' && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{t.configureLayout}</p>
                      <PillGroup
                        options={[
                          { value: 'stacked', label: t.layoutStacked },
                          { value: 'sidebyside', label: t.layoutSideBySide },
                        ]}
                        value={post.layoutMode}
                        onChange={(v) => updatePostConfig(post.id, { layoutMode: v })}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* ── STEP: Upload / Gallery / Editor ─────────────────────────── */}
        {subStep === 'upload' && (
          <EditorLayout
            images={images}
            posts={posts}
            slotDataMap={slotData}
            activePostId={activePost?.id || null}
            onActivePostChange={setActivePostId}
            selectedImageId={selectedImageId}
            selectedTemplate={selectedTemplate}
            watermarkText={watermarkText}
            bulkDragging={bulkDragging}
            dragOver={dragOver}
            lang={lang}
            effectiveActiveSlot={effectiveActiveSlot}
            activeState={activeState}
            activeRef={activeRef}
            inputRef={inputRef}
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
            onTemplateChange={handleTemplateChange}
            onWatermarkChange={setWatermarkText}
            onAIImageGenerated={handleAIImageGenerated}
            onAIImageForPost={handleAIImageForPost}
            renderTemplateForPost={renderTemplateForPost}
          />
        )}

      </Stagger>
    </div>
  )
}
