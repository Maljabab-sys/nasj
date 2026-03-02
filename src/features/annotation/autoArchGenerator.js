import { ANNOTATION_COLOR, DASH_PATTERN, LINE_WIDTH } from '../../constants/annotation'

/**
 * Generates a pre-set arch stroke.
 *
 * type = 'incisal'    → gentle U-curve across incisal edges (frontal view, like case1.jpg)
 * type = 'arch_upper' → full parabolic arch (occlusal view, like case1_upper images)
 *
 * All points are normalized (0–1).
 */
export function generateArchStroke(type = 'incisal') {
  const base = {
    color: ANNOTATION_COLOR,
    lineWidth: LINE_WIDTH,
    dashPattern: DASH_PATTERN,
  }

  if (type === 'incisal') {
    return {
      ...base,
      type: 'arch',
      points: [
        { x: 0.10, y: 0.52 },
        { x: 0.14, y: 0.57 },
        { x: 0.20, y: 0.50 },
        { x: 0.35, y: 0.44 },
        { x: 0.50, y: 0.43 },
        { x: 0.65, y: 0.44 },
        { x: 0.80, y: 0.50 },
        { x: 0.86, y: 0.57 },
        { x: 0.90, y: 0.52 },
      ],
    }
  }

  // arch_upper: full parabolic arch for occlusal view
  return {
    ...base,
    type: 'arch',
    points: [
      { x: 0.08, y: 0.92 },
      { x: 0.08, y: 0.70 },
      { x: 0.12, y: 0.45 },
      { x: 0.20, y: 0.25 },
      { x: 0.35, y: 0.12 },
      { x: 0.50, y: 0.08 },
      { x: 0.65, y: 0.12 },
      { x: 0.80, y: 0.25 },
      { x: 0.88, y: 0.45 },
      { x: 0.92, y: 0.70 },
      { x: 0.92, y: 0.92 },
    ],
  }
}
