const POSITION_MAP = {
  'top-left':      { x: 0.12, y: 0.08 },
  'top-center':    { x: 0.50, y: 0.08 },
  'top-right':     { x: 0.88, y: 0.08 },
  'center-left':   { x: 0.12, y: 0.50 },
  'center':        { x: 0.50, y: 0.50 },
  'center-right':  { x: 0.88, y: 0.50 },
  'bottom-left':   { x: 0.12, y: 0.90 },
  'bottom-center': { x: 0.50, y: 0.90 },
  'bottom-right':  { x: 0.88, y: 0.90 },
}

const SIZE_MAP = {
  small: 18,
  medium: 28,
  large: 40,
}

const ALIGN_MAP = {
  'top-left': 'left',
  'top-center': 'center',
  'top-right': 'right',
  'center-left': 'left',
  'center': 'center',
  'center-right': 'right',
  'bottom-left': 'left',
  'bottom-center': 'center',
  'bottom-right': 'right',
}

export function mapAIOverlaysToStrokes(overlays) {
  if (!Array.isArray(overlays)) return []
  return overlays
    .filter((o) => o.text && typeof o.text === 'string' && o.text.trim())
    .map((o) => {
      const pos = POSITION_MAP[o.position] || POSITION_MAP['center']
      const fontSize = SIZE_MAP[o.fontSize] || SIZE_MAP['medium']
      const textAlign = ALIGN_MAP[o.position] || 'center'
      return {
        type: 'text',
        text: o.text.trim(),
        x: pos.x,
        y: pos.y,
        fontSize,
        fontFamily: 'Nunito',
        color: o.color || '#ffffff',
        bgColor: 'rgba(0,0,0,0.45)',
        textAlign,
        direction: 'ltr',
        bgShape: 'rounded',
      }
    })
}
