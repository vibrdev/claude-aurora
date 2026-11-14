import { lake } from './lake'

// The scenes behind the conversation: each one a self-contained SVG, drawn in a
// 1600 by 1000 box and sliced to fill any window. The middle is kept calm for
// the words, and the subject (sun, moon) sits off to the right above the ridge.

const W = 1600
const H = 1000

/** A small seeded generator, so a scene is the same on every draw. */
function seeded(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const n = (value: number): string => value.toFixed(1).replace(/\.0$/, '')

/** A ridge line across the box: summed waves plus a little grit, closed to the foot. */
function ridge(seed: number, base: number, height: number, rough: number, fill: string): string {
  const random = seeded(seed)
  const waves = [0, 1, 2, 3].map(i => ({
    length: (520 / (i + 1)) * (0.8 + random() * 0.5),
    phase: random() * Math.PI * 2,
    weight: 1 / (i + 1.4),
  }))
  const points: string[] = []

  for (let x = -40; x <= W + 40; x += 20) {
    let y = 0
    for (const wave of waves) y += Math.sin(x / wave.length + wave.phase) * wave.weight
    y = base - (y * 0.5 + 0.5) * height - random() * rough
    points.push(`${x},${n(y)}`)
  }

  return `<polygon fill="${fill}" points="-40,${H} ${points.join(' ')} ${W + 40},${H}"/>`
}

function stars(seed: number, count: number, lowest: number, color: string): string {
  const random = seeded(seed)
  let out = ''

  for (let i = 0; i < count; i += 1) {
    const x = random() * W
    const y = random() * random() * lowest
    const big = random() > 0.9
    const r = big ? 1.5 + random() * 0.9 : 0.5 + random() * 0.8
    out += `<circle class="s s${i % 5}" cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}"/>`
  }

  return out
}

const STYLE =
  '.s{animation:tw 5s ease-in-out infinite}.s1{animation-duration:7s;animation-delay:-2s}' +
  '.s2{animation-duration:9s;animation-delay:-5s}.s3{animation-duration:6s;animation-delay:-1s}' +
  '.s4{animation-duration:11s;animation-delay:-7s}@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}' +
  '.shoot{opacity:0;animation:shoot 23s linear infinite}' +
  '@keyframes shoot{0%,91%{opacity:0;transform:translate(0,0)}92%{opacity:.9}' +
  '96%{opacity:0;transform:translate(-340px,150px)}100%{opacity:0;transform:translate(-340px,150px)}}' +
  '.drift{animation:drift 140s ease-in-out infinite}.drift2{animation:drift 200s ease-in-out infinite reverse}' +
  '@keyframes drift{0%,100%{transform:translateX(-260px)}50%{transform:translateX(260px)}}' +
  '.pulse{animation:pulse 9s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.75}50%{opacity:1}}' +
  '.wave{transform-box:fill-box;transform-origin:center;animation:wave 26s ease-in-out infinite}' +
  '.wave2{animation-duration:34s;animation-delay:-9s}.wave3{animation-duration:42s;animation-delay:-20s}' +
  '@keyframes wave{0%,100%{transform:translateX(-50px) skewX(-5deg) scaleY(1);opacity:.55}' +
  '50%{transform:translateX(60px) skewX(6deg) scaleY(1.12);opacity:1}}' +
  '@media (prefers-reduced-motion:reduce){*{animation:none!important}}'

function frame(body: string, defs: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>${defs}</defs><style>${STYLE}</style>${body}</svg>`
  )
}

const SHOOTING_STAR =
  '<g class="shoot"><line x1="1180" y1="110" x2="1250" y2="80" stroke="url(#trail)" stroke-width="2.2" stroke-linecap="round"/></g>'
const TRAIL =
  '<linearGradient id="trail" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'

/** Dusk: the last of the sun behind a plum ridge, the first stars out above it. */
function dusk(): string {
  const horizon = 770
  const sunX = 1150
  const sunY = 742
  const sunR = 132
  // The dark bands across the lower half of the sun, thicker toward the foot.
  let bands = ''
  for (let i = 0; i < 6; i += 1) {
    const y = sunY - 6 + i * 23
    bands += `<rect x="${sunX - sunR - 4}" y="${y}" width="${sunR * 2 + 8}" height="${n(4 + i * 2.4)}" fill="#000"/>`
  }
  // The plain below the ridge: a faint grid running to the horizon.
  let grid = ''
  for (let i = -14; i <= 14; i += 1) {
    grid += `<line x1="${W / 2 + i * 34}" y1="${horizon + 70}" x2="${W / 2 + i * 240}" y2="${H}"/>`
  }
  for (let i = 0; i < 7; i += 1) {
    const y = horizon + 70 + ((i + 1) / 7) ** 2.1 * (H - horizon - 70)
    grid += `<line x1="0" y1="${n(y)}" x2="${W}" y2="${n(y)}"/>`
  }

  const defs =
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#0f0820"/><stop offset="0.3" stop-color="#1f0f3b"/>' +
    '<stop offset="0.52" stop-color="#4a1a5c"/><stop offset="0.66" stop-color="#9b2f66"/>' +
    '<stop offset="0.74" stop-color="#e2574f"/><stop offset="0.79" stop-color="#ff9a4a"/></linearGradient>' +
    '<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#fff0a8"/><stop offset="0.45" stop-color="#ffa24f"/><stop offset="1" stop-color="#ff3f7f"/></linearGradient>' +
    '<radialGradient id="halo"><stop offset="0" stop-color="#ffb37a" stop-opacity="0.75"/>' +
    '<stop offset="0.45" stop-color="#ff5f8a" stop-opacity="0.28"/><stop offset="1" stop-color="#ff5f8a" stop-opacity="0"/></radialGradient>' +
    `<mask id="cut"><rect width="${W}" height="${H}" fill="#fff"/>${bands}</mask>` +
    '<linearGradient id="plain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b0c2b"/><stop offset="1" stop-color="#090412"/></linearGradient>' +
    '<linearGradient id="cloud" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff8f7a" stop-opacity="0"/>' +
    '<stop offset="0.5" stop-color="#ff8f7a" stop-opacity="0.34"/><stop offset="1" stop-color="#ff8f7a" stop-opacity="0"/></linearGradient>' +
    TRAIL

  const body =
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    stars(11, 120, 560, '#ffe9f4') +
    SHOOTING_STAR +
    `<g class="drift"><rect x="150" y="520" width="760" height="7" rx="3.5" fill="url(#cloud)"/>` +
    `<rect x="620" y="585" width="900" height="9" rx="4.5" fill="url(#cloud)"/></g>` +
    `<g class="drift2"><rect x="-80" y="640" width="820" height="8" rx="4" fill="url(#cloud)"/>` +
    `<rect x="900" y="470" width="620" height="5" rx="2.5" fill="url(#cloud)"/></g>` +
    `<circle class="pulse" cx="${sunX}" cy="${sunY}" r="${sunR * 3}" fill="url(#halo)"/>` +
    `<circle cx="${sunX}" cy="${sunY}" r="${sunR}" fill="url(#sun)" mask="url(#cut)"/>` +
    ridge(3, horizon + 6, 150, 5, '#5b2162') +
    ridge(7, horizon + 30, 120, 7, '#38144a') +
    ridge(19, horizon + 74, 110, 9, '#1b0c2b') +
    `<rect y="${horizon + 70}" width="${W}" height="${H - horizon - 70}" fill="url(#plain)"/>` +
    `<g stroke="#ff6fb0" stroke-opacity="0.2" stroke-width="1.2">${grid}</g>`

  return frame(body, defs)
}

/** Night: a moon over a navy ridge, with aurora curtains moving slowly above it. */
function night(): string {
  const horizon = 790
  const curtain = (x: number, width: number, top: number, id: string, cls: string): string =>
    `<path class="wave ${cls}" fill="url(#${id})" filter="url(#soft)" d="M${x},${horizon - 40} ` +
    `C${n(x + width * 0.2)},${top + 220} ${n(x + width * 0.1)},${top + 60} ${n(x + width * 0.35)},${top} ` +
    `C${n(x + width * 0.6)},${top + 40} ${n(x + width * 0.75)},${top + 200} ${x + width},${horizon - 60} Z"/>`

  const defs =
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#040812"/><stop offset="0.45" stop-color="#0a1830"/>' +
    '<stop offset="0.8" stop-color="#123650"/></linearGradient>' +
    '<linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c6cff" stop-opacity="0"/>' +
    '<stop offset="0.35" stop-color="#38e0b0" stop-opacity="0.55"/><stop offset="1" stop-color="#38e0b0" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c26bff" stop-opacity="0"/>' +
    '<stop offset="0.4" stop-color="#4fd8e8" stop-opacity="0.45"/><stop offset="1" stop-color="#4fd8e8" stop-opacity="0"/></linearGradient>' +
    '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="26"/></filter>' +
    '<radialGradient id="halo"><stop offset="0" stop-color="#dff3ff" stop-opacity="0.5"/>' +
    '<stop offset="1" stop-color="#dff3ff" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="plain" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07121f"/><stop offset="1" stop-color="#02060c"/></linearGradient>' +
    TRAIL

  const body =
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    stars(29, 170, 700, '#eaf6ff') +
    SHOOTING_STAR +
    curtain(40, 620, 150, 'a1', '') +
    curtain(480, 700, 90, 'a2', 'wave2') +
    curtain(980, 640, 190, 'a1', 'wave3') +
    `<circle class="pulse" cx="1290" cy="230" r="150" fill="url(#halo)"/>` +
    `<circle cx="1290" cy="230" r="44" fill="#f2f8ff"/><circle cx="1268" cy="214" r="41" fill="#060d1c"/>` +
    ridge(5, horizon + 4, 170, 6, '#12304a') +
    ridge(13, horizon + 36, 130, 8, '#0b2036') +
    ridge(23, horizon + 86, 110, 10, '#07121f') +
    `<rect y="${horizon + 84}" width="${W}" height="${H - horizon - 84}" fill="url(#plain)"/>`

  return frame(body, defs)
}

export type SceneId = 'dusk' | 'night' | 'lake'

const drawn: { [id: string]: string } = {}

export function sceneSvg(id: SceneId): string {
  return (drawn[id] ??= id === 'night' ? night() : id === 'lake' ? lake() : dusk())
}
