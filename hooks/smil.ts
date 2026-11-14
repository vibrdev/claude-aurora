// What the scenes share: a seeded generator, number formatting, and the motion.
//
// The motion is SMIL (<animate>, <animateTransform>) written into each element.
// The desktop app draws a scene in a frame that applies no <style> block, so a
// CSS animation there never starts and the scene sits still; SMIL does run.

/** A small seeded generator, so a scene is the same on every draw. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const n = (value: number): string => value.toFixed(1).replace(/\.0$/, '')

// Ease in and out between each pair of values of a there-and-back loop.
const EASE3 = ' calcMode="spline" keyTimes="0;0.5;1" keySplines="0.42 0 0.58 1;0.42 0 0.58 1"'

/** Loops an attribute through `values` (three of them ease there and back). */
export function loop(attribute: string, values: (string | number)[], seconds: number, startedAgo = 0, eased = true): string {
  return (
    `<animate attributeName="${attribute}" values="${values.join(';')}" dur="${n(seconds)}s" begin="${n(-startedAgo)}s" ` +
    `repeatCount="indefinite"${eased && values.length === 3 ? EASE3 : ''}/>`
  )
}

/** Loops a transform (`translate`, `rotate`, `skewX`, `scale`) through `values`. */
export function move(
  type: 'translate' | 'rotate' | 'skewX' | 'scale',
  values: string[],
  seconds: number,
  startedAgo = 0,
  extra = '',
): string {
  return (
    `<animateTransform attributeName="transform" type="${type}" values="${values.join(';')}" dur="${n(seconds)}s" ` +
    `begin="${n(-startedAgo)}s" repeatCount="indefinite"${values.length === 3 && extra === '' ? EASE3 : ''}${extra}/>`
  )
}

/** A shooting star: unseen for most of its loop, then one quick streak down and left. */
export function shootingStar(x: number, y: number, seconds: number): string {
  const times = ' keyTimes="0;0.9;0.915;0.96;1"'

  return (
    `<g opacity="0"><line x1="${x}" y1="${y}" x2="${x + 70}" y2="${y - 30}" stroke="url(#trail)" stroke-width="2.2" stroke-linecap="round"/>` +
    `<animate attributeName="opacity" values="0;0;0.9;0;0" dur="${seconds}s" repeatCount="indefinite"${times}/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 0;-340 150;-340 150" dur="${seconds}s" repeatCount="indefinite"${times}/></g>`
  )
}

export const TRAIL =
  '<linearGradient id="trail" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
