import { useState, useRef, useCallback } from 'react'

export function useCaptionGenerator() {
  const [captions, setCaptions] = useState([])
  const [hashtags, setHashtags] = useState([])
  const [selectedCaption, setSelectedCaption] = useState(null)
  const [selectedHashtags, setSelectedHashtags] = useState(new Set())
  const [editedCaption, setEditedCaption] = useState(null)
  const [description, setDescription] = useState('')
  const [accent, setAccent] = useState('neutral')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHashtags, setIsLoadingHashtags] = useState(false)
  const [error, setError] = useState(null)
  const lastRequestRef = useRef(null)

  // target: 'both' | 'captions' | 'hashtags'
  const generate = useCallback(async (desc, lang, accentVal, { target = 'both' } = {}) => {
    if (!desc.trim()) return
    if (target === 'hashtags') setIsLoadingHashtags(true)
    else setIsLoading(true)
    setError(null)

    const body = { description: desc.trim(), lang, accent: accentVal, target }
    lastRequestRef.current = body

    try {
      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `API error: ${res.status}`)
      }

      const data = await res.json()

      if (target !== 'hashtags') {
        setCaptions(data.captions || [])
        setSelectedCaption(0)
        setEditedCaption(null)
      }
      if (target !== 'captions') {
        setHashtags(data.hashtags || [])
        setSelectedHashtags(new Set((data.hashtags || []).map((_, i) => i)))
      }
    } catch (err) {
      console.error('[CaptionGenerator]', err.message)
      setError(err.message)
    } finally {
      if (target === 'hashtags') setIsLoadingHashtags(false)
      else setIsLoading(false)
    }
  }, [])

  // Retry the exact last call
  const retry = useCallback(async () => {
    if (lastRequestRef.current) {
      const { description: desc, lang, accent: acc, target } = lastRequestRef.current
      await generate(desc, lang, acc, { target })
    }
  }, [generate])

  // Refresh captions only (same description)
  const refresh = useCallback(async (lang) => {
    if (lastRequestRef.current) {
      await generate(lastRequestRef.current.description, lang, lastRequestRef.current.accent, { target: 'captions' })
    }
  }, [generate])

  // Refresh hashtags only (same description)
  const refreshHashtags = useCallback(async (lang) => {
    if (lastRequestRef.current) {
      await generate(lastRequestRef.current.description, lang, lastRequestRef.current.accent, { target: 'hashtags' })
    }
  }, [generate])

  const selectCaption = useCallback((index) => {
    setSelectedCaption(index)
    setEditedCaption(null)
  }, [])

  const toggleHashtag = useCallback((index) => {
    setSelectedHashtags((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const selectAllHashtags = useCallback(() => {
    setSelectedHashtags(new Set(hashtags.map((_, i) => i)))
  }, [hashtags])

  const deselectAllHashtags = useCallback(() => {
    setSelectedHashtags(new Set())
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const finalCaption = editedCaption ?? (selectedCaption !== null ? captions[selectedCaption] : '') ?? ''
  const finalHashtags = hashtags.filter((_, i) => selectedHashtags.has(i))

  return {
    captions,
    hashtags,
    selectedCaption,
    selectedHashtags,
    editedCaption,
    description,
    accent,
    isLoading,
    isLoadingHashtags,
    error,
    generate,
    retry,
    refresh,
    refreshHashtags,
    selectCaption,
    toggleHashtag,
    selectAllHashtags,
    deselectAllHashtags,
    setEditedCaption,
    setDescription,
    setAccent,
    clearError,
    finalCaption,
    finalHashtags,
  }
}
