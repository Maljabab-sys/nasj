import { ANNOTATION_COLOR, DASH_PATTERN, LINE_WIDTH } from '../../constants/annotation'

/**
 * Draws a Catmull-Rom smooth curve through the given pixel points.
 */
function drawCatmullRom(ctx, pts) {
  if (pts.length < 2) return
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
}

/**
 * Draws a single stroke onto ctx.
 * Coordinates in stroke.points are normalized (0–1); they are scaled by W/H.
 */
export function drawStroke(ctx, stroke, W, H) {
  const pts = stroke.points.map((p) => ({ x: p.x * W, y: p.y * H }))
  if (pts.length < 2) return

  ctx.save()
  ctx.strokeStyle = stroke.color ?? ANNOTATION_COLOR
  ctx.lineWidth = stroke.lineWidth ?? LINE_WIDTH
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.setLineDash(stroke.dashPattern ?? DASH_PATTERN)

  ctx.beginPath()
  if (stroke.type === 'arch') {
    drawCatmullRom(ctx, pts)
  } else {
    ctx.moveTo(pts[0].x, pts[0].y)
    pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
  }
  ctx.stroke()
  ctx.restore()
}

/**
 * Draws all strokes from a list onto a canvas-region defined by (rx, ry, rw, rh).
 * Points are normalized 0–1 relative to rw/rh, then offset by rx/ry.
 */
export function drawAnnotationsOnto(ctx, strokes, rx, ry, rw, rh) {
  if (!strokes || strokes.length === 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(rx, ry, rw, rh)
  ctx.clip()

  strokes.forEach((stroke) => {
    const pts = stroke.points.map((p) => ({
      x: rx + p.x * rw,
      y: ry + p.y * rh,
    }))
    if (pts.length < 2) return

    ctx.save()
    ctx.strokeStyle = stroke.color ?? ANNOTATION_COLOR
    ctx.lineWidth = stroke.lineWidth ?? LINE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash(stroke.dashPattern ?? DASH_PATTERN)

    ctx.beginPath()
    if (stroke.type === 'arch') {
      // inline catmull-rom with actual pixel coords
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[Math.min(pts.length - 1, i + 2)]
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
      }
    } else {
      ctx.moveTo(pts[0].x, pts[0].y)
      pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
    }
    ctx.stroke()
    ctx.restore()
  })

  ctx.restore()
}

/**
 * Draws text with manual letter-spacing (canvas letterSpacing compat workaround).
 */
export function drawSpacedText(ctx, text, cx, y, letterSpacing = 3) {
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const totalWidth =
    widths.reduce((a, b) => a + b, 0) + (chars.length - 1) * letterSpacing
  let x = cx - totalWidth / 2
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y)
    x += widths[i] + letterSpacing
  })
}
