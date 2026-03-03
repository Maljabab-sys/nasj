import { DEFAULT_DOCTOR_NAME } from '../../constants/layout'

/**
 * Returns text stroke objects to inject into a slot for a given template.
 * These become editable annotations the user can move, resize, and edit.
 *
 * @param {string} templateId   - 'classic' | 'elegant' | 'clean'
 * @param {string} slotKey      - 'before' | 'after' | 'single'
 * @param {string} labelText    - Localized label (e.g. "Before", "After")
 * @param {string} watermarkText - Doctor/provider name
 * @param {string} layoutMode   - 'stacked' | 'sidebyside' | 'single'
 * @returns {Array} Array of text stroke objects
 */
export function getTemplateLabelStrokes(templateId, slotKey, labelText, watermarkText, layoutMode) {
  if (templateId === 'clean') return []

  const strokes = []

  // ── Labels (Before / After) — only for B&A slots ──────────────────
  if (slotKey !== 'single') {
    if (templateId === 'classic') {
      strokes.push({
        type: 'text',
        templateId: 'classic',
        text: labelText,
        x: 0.05,
        y: 0.08,
        fontSize: 32,
        fontFamily: 'Nunito',
        color: '#ffffff',
        bgColor: 'rgba(0,0,0,0.60)',
        textAlign: 'left',
        direction: 'ltr',
        bgShape: 'rounded',
      })
    }

    if (templateId === 'elegant') {
      strokes.push({
        type: 'text',
        templateId: 'elegant',
        text: labelText.toUpperCase(),
        x: 0.5,
        y: 0.90,
        fontSize: 24,
        fontFamily: 'Nunito',
        color: '#ffffff',
        bgColor: 'rgba(0,0,0,0.45)',
        textAlign: 'center',
        direction: 'ltr',
        bgShape: 'rounded',
      })
    }
  }

  // ── Watermark — placed in the "before" slot (stacked/sidebyside) or "single" slot ──
  const wm = watermarkText || DEFAULT_DOCTOR_NAME
  if (wm) {
    // Only inject watermark into the "before" slot (for B&A) or "single" slot
    const isWatermarkSlot = slotKey === 'before' || slotKey === 'single'
    if (isWatermarkSlot) {
      if (templateId === 'classic') {
        if (layoutMode === 'stacked' || layoutMode === 'single') {
          strokes.push({
            type: 'text',
            templateId: 'classic',
            text: wm.toUpperCase(),
            x: 0.5,
            y: 0.95,
            fontSize: 24,
            fontFamily: 'Nunito',
            color: 'rgba(255,255,255,0.90)',
            bgColor: 'rgba(0,0,0,0.60)',
            textAlign: 'center',
            direction: 'ltr',
            bgShape: 'rounded',
          })
        } else if (layoutMode === 'sidebyside') {
          strokes.push({
            type: 'text',
            templateId: 'classic',
            text: wm.toUpperCase(),
            x: 0.95,
            y: 0.5,
            fontSize: 24,
            fontFamily: 'Nunito',
            color: 'rgba(255,255,255,0.90)',
            bgColor: 'rgba(0,0,0,0.60)',
            textAlign: 'center',
            direction: 'ltr',
            bgShape: 'rounded',
          })
        }
      }

      if (templateId === 'elegant') {
        strokes.push({
          type: 'text',
          templateId: 'elegant',
          text: wm.toUpperCase(),
          x: 0.5,
          y: 0.95,
          fontSize: 20,
          fontFamily: 'Nunito',
          color: '#ffffff',
          bgColor: 'rgba(0,0,0,0.45)',
          textAlign: 'center',
          direction: 'ltr',
          bgShape: 'rounded',
        })
      }
    }
  }

  return strokes
}
