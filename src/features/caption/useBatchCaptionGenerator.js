import { useState, useRef, useCallback } from 'react'

const EMPTY_RESULT = {
  captions: [],
  hashtags: [],
  selectedCaptionIndex: 0,
  editedCaption: null,
  selectedHashtags: new Set(),
  status: 'idle',
  error: null,
}

export function useBatchCaptionGenerator() {
  const [batchResults, setBatchResults] = useState({})
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: 'idle' })
  const [description, setDescription] = useState('')
  const [accent, setAccent] = useState('neutral')
  const [platform, setPlatform] = useState('instagram')
  const [provider, setProvider] = useState('gemini')
  const lastRequestRef = useRef(null)

  // Call the API for a single post
  async function callAPI(post, lang, accentVal, { useImages = false, descOverride } = {}) {
    const images = useImages
      ? [post.beforeCropped, post.afterCropped].filter(Boolean)
      : []
    const desc = (descOverride ?? description).trim()
      || (images.length > 0 ? 'Describe what you see in the attached photos' : '')

    const body = { description: desc, lang, accent: accentVal, target: 'both', platform, provider }
    if (images.length > 0) body.images = images

    const res = await fetch('/api/generate-captions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `API error: ${res.status}`)
    }

    return res.json()
  }

  // Generate captions for ALL posts sequentially
  const generateAll = useCallback(async (posts, lang, accentVal, { useImages = false } = {}) => {
    lastRequestRef.current = { lang, accent: accentVal, useImages }
    setProgress({ current: 0, total: posts.length, phase: 'generating' })

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]
      setProgress((prev) => ({ ...prev, current: i + 1 }))
      setBatchResults((prev) => ({
        ...prev,
        [post.id]: { ...EMPTY_RESULT, status: 'loading' },
      }))

      try {
        const data = await callAPI(post, lang, accentVal, { useImages })
        setBatchResults((prev) => ({
          ...prev,
          [post.id]: {
            captions: data.captions || [],
            hashtags: data.hashtags || [],
            selectedCaptionIndex: 0,
            editedCaption: null,
            selectedHashtags: new Set((data.hashtags || []).map((_, j) => j)),
            status: 'done',
            error: null,
          },
        }))
      } catch (err) {
        console.error(`[BatchCaptionGen] Post ${post.id}:`, err.message)
        setBatchResults((prev) => ({
          ...prev,
          [post.id]: { ...EMPTY_RESULT, status: 'error', error: err.message },
        }))
      }
    }

    setProgress((prev) => ({ ...prev, phase: 'done' }))
  }, [platform, provider, description])

  // Regenerate captions for a single post
  const regeneratePost = useCallback(async (post, lang, accentVal, { useImages = false } = {}) => {
    setBatchResults((prev) => ({
      ...prev,
      [post.id]: { ...(prev[post.id] || EMPTY_RESULT), status: 'loading', error: null },
    }))

    try {
      const data = await callAPI(post, lang, accentVal, { useImages })
      setBatchResults((prev) => ({
        ...prev,
        [post.id]: {
          captions: data.captions || [],
          hashtags: data.hashtags || [],
          selectedCaptionIndex: 0,
          editedCaption: null,
          selectedHashtags: new Set((data.hashtags || []).map((_, j) => j)),
          status: 'done',
          error: null,
        },
      }))
    } catch (err) {
      console.error(`[BatchCaptionGen] Regenerate ${post.id}:`, err.message)
      setBatchResults((prev) => ({
        ...prev,
        [post.id]: { ...(prev[post.id] || EMPTY_RESULT), status: 'error', error: err.message },
      }))
    }
  }, [platform, provider, description])

  // Per-post selection actions
  const selectCaption = useCallback((postId, index) => {
    setBatchResults((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], selectedCaptionIndex: index, editedCaption: null },
    }))
  }, [])

  const setEditedCaption = useCallback((postId, text) => {
    setBatchResults((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], editedCaption: text },
    }))
  }, [])

  const toggleHashtag = useCallback((postId, index) => {
    setBatchResults((prev) => {
      const result = prev[postId]
      if (!result) return prev
      const next = new Set(result.selectedHashtags)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return { ...prev, [postId]: { ...result, selectedHashtags: next } }
    })
  }, [])

  const selectAllHashtags = useCallback((postId) => {
    setBatchResults((prev) => {
      const result = prev[postId]
      if (!result) return prev
      return { ...prev, [postId]: { ...result, selectedHashtags: new Set(result.hashtags.map((_, i) => i)) } }
    })
  }, [])

  const deselectAllHashtags = useCallback((postId) => {
    setBatchResults((prev) => {
      const result = prev[postId]
      if (!result) return prev
      return { ...prev, [postId]: { ...result, selectedHashtags: new Set() } }
    })
  }, [])

  // Get the final caption text for a post
  const getFinalCaption = useCallback((postId) => {
    const r = batchResults[postId]
    if (!r) return ''
    return r.editedCaption ?? r.captions[r.selectedCaptionIndex] ?? ''
  }, [batchResults])

  // Get the final selected hashtags for a post
  const getFinalHashtags = useCallback((postId) => {
    const r = batchResults[postId]
    if (!r) return []
    return r.hashtags.filter((_, i) => r.selectedHashtags.has(i))
  }, [batchResults])

  return {
    batchResults,
    progress,
    description,
    accent,
    platform,
    provider,
    lastRequestRef,
    generateAll,
    regeneratePost,
    selectCaption,
    setEditedCaption,
    toggleHashtag,
    selectAllHashtags,
    deselectAllHashtags,
    getFinalCaption,
    getFinalHashtags,
    setDescription,
    setAccent,
    setPlatform,
    setProvider,
  }
}
