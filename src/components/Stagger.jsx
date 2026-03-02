/**
 * Stagger — wraps its direct children so each one fades+slides in
 * with an incrementing delay, creating a staggered entrance effect.
 *
 * Props:
 *   gap          — delay between each child in ms (default 60)
 *   start        — initial delay before the first child in ms (default 0)
 *   getClassName — optional fn(index) => string for extra classes on each wrapper div
 */
import { Children } from 'react'

export default function Stagger({ children, gap = 60, start = 0, getClassName }) {
  return (
    <>
      {Children.map(children, (child, i) =>
        child == null ? null : (
          <div
            className={`stagger-item${getClassName ? ` ${getClassName(i)}` : ''}`}
            style={{ '--stagger-delay': `${start + i * gap}ms` }}
          >
            {child}
          </div>
        )
      )}
    </>
  )
}
