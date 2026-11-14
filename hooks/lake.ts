// Lake: a sunset over still water, drawn closer to a photograph than the other
// scenes. The cloud deck and the water's grain are noise the renderer makes once
// and keeps; everything that moves (glints, reeds, birds, light on the clouds)
// is plain shapes, so the motion stays cheap.

const W = 1600
const H = 1000
const HORIZON = 600
const SUN_X = 640

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

/** A noise filter that paints one color where the noise is high: clouds, grain. */
function noise(id: string, frequency: string, octaves: number, seed: number, rgb: [number, number, number], gain: number, cut: number): string {
  const [r, g, b] = rgb.map(one => n(one / 255)) as [string, string, string]

  return (
    `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">` +
    `<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}"/>` +
    `<feColorMatrix values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${gain} 0 0 0 ${cut}"/></filter>`
  )
}

function fade(id: string, stops: [number, number][]): string {
  const marks = stops.map(([at, level]) => `<stop offset="${at}" stop-color="#fff" stop-opacity="${level}"/>`).join('')

  return `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1">${marks}</linearGradient>`
}

function sky(): string {
  const layer = (filter: string, y: number, height: number, maskId: string): string =>
    `<g mask="url(#${maskId})"><rect x="0" y="${y}" width="${W}" height="${height}" filter="url(#${filter})"/></g>`
  const mask = (id: string, y: number, height: number): string =>
    `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="${y}" width="${W}" height="${height}">` +
    `<rect x="0" y="${y}" width="${W}" height="${height}" fill="url(#${id}g)"/></mask>`

  return (
    `<rect width="${W}" height="${HORIZON + 2}" fill="url(#sky)"/>` +
    `<ellipse class="pulse" cx="${SUN_X}" cy="${HORIZON - 14}" rx="700" ry="330" fill="url(#glow)"/>` +
    mask('mPink', 120, 480) +
    layer('cPink', 120, 480, 'mPink') +
    mask('mLit', 240, 360) +
    layer('cLit', 240, 360, 'mLit') +
    mask('mDark', 0, 560) +
    layer('cDark', 0, 560, 'mDark') +
    // Thin bright streaks that drift under the deck, so the sky is never quite still.
    `<g class="drift"><ellipse cx="420" cy="505" rx="330" ry="5" fill="url(#streak)"/>` +
    `<ellipse cx="1150" cy="470" rx="420" ry="6" fill="url(#streak)"/></g>` +
    `<g class="drift2"><ellipse cx="820" cy="540" rx="380" ry="4" fill="url(#streak)"/>` +
    `<ellipse cx="250" cy="440" rx="260" ry="4" fill="url(#streak)"/></g>` +
    `<circle cx="${SUN_X}" cy="${HORIZON - 20}" r="84" fill="url(#sunHalo)"/>` +
    `<circle cx="${SUN_X}" cy="${HORIZON - 20}" r="21" fill="#fff8e0"/>`
  )
}

function birds(): string {
  const bird = (x: number, y: number, size: number): string =>
    `<path d="M${x},${y} q${n(size * 0.5)},${n(-size * 0.55)} ${size},0 q${n(size * 0.5)},${n(-size * 0.55)} ${size},0" />`

  return (
    `<g class="fly" fill="none" stroke="#17121c" stroke-width="1.6" stroke-linecap="round">` +
    bird(0, 250, 9) + bird(34, 238, 7) + bird(58, 262, 8) + bird(96, 246, 6) + `</g>`
  )
}

function shore(): string {
  const random = seeded(41)
  const far: string[] = []

  for (let x = -40; x <= W + 40; x += 12) {
    const hill = x < 420 ? 20 * Math.sin(((x + 40) / 460) * Math.PI) : 0
    far.push(`${x},${n(HORIZON - 3 - hill - random() * 7)}`)
  }
  // The stand of trees on the right bank: overlapping crowns under a rising envelope.
  let trees = ''
  for (let i = 0; i < 190; i += 1) {
    const x = 1120 + random() * 540
    const rise = Math.max(0, (x - 1120) / 480) ** 0.7 * 290
    const y = HORIZON + 6 - random() * rise
    trees += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(7 + random() * 21)}"/>`
  }
  // A few bare trunks and branches standing clear of the crowns.
  let trunks = ''
  for (let i = 0; i < 7; i += 1) {
    const x = 1210 + random() * 330
    const top = HORIZON - 150 - random() * 150
    trunks += `<path d="M${n(x)},${HORIZON} L${n(x + random() * 8 - 4)},${n(top)} M${n(x)},${n(top + 60)} l${n(-18 - random() * 14)},${n(-34)} M${n(x)},${n(top + 90)} l${n(16 + random() * 16)},${n(-40)}"/>`
  }

  return (
    `<polygon fill="#191320" points="-40,${HORIZON + 4} ${far.join(' ')} ${W + 40},${HORIZON + 4}"/>` +
    `<g fill="#0d0a12" filter="url(#rough)">${trees}</g>` +
    `<g fill="none" stroke="#0d0a12" stroke-width="2.4" stroke-linecap="round">${trunks}</g>` +
    // The jetty, small and far, with its posts.
    `<g fill="#0e0b13"><rect x="452" y="${HORIZON + 5}" width="128" height="4"/>` +
    [458, 486, 514, 542, 572].map(x => `<rect x="${x}" y="${HORIZON - 3}" width="2.5" height="19"/>`).join('') +
    `<rect x="452" y="${HORIZON - 4}" width="128" height="1.6"/></g>`
  )
}

function water(): string {
  const random = seeded(77)
  let glints = ''

  // Sunlight broken on the water: narrow near the horizon, wide and sparse near the foot.
  for (let i = 0; i < 130; i += 1) {
    const t = random() ** 1.7
    const y = HORIZON + 8 + t * 370
    const spread = 10 + t * 190
    const width = 5 + t * (18 + random() * 70)
    const x = SUN_X + (random() + random() - 1) * spread - width / 2
    glints += `<rect class="g g${i % 6}" x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(0.9 + t * 2.2)}" rx="1.5" opacity="${n(0.2 + random() * 0.45)}"/>`
  }

  return (
    `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#water)"/>` +
    `<ellipse cx="${SUN_X}" cy="${HORIZON}" rx="250" ry="420" fill="url(#column)"/>` +
    `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" filter="url(#grainLight)" opacity="0.5"/>` +
    `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" filter="url(#grainDark)" opacity="0.55"/>` +
    // The far shore and trees, mirrored and dimmed.
    `<rect y="${HORIZON}" width="${W}" height="16" fill="url(#shade)"/>` +
    `<ellipse cx="1420" cy="${HORIZON + 4}" rx="330" ry="150" fill="url(#treeShade)"/>` +
    `<g fill="#ffcf94">${glints}</g>`
  )
}

function foreground(): string {
  const random = seeded(5)
  // Reeds on the left, in three groups that sway out of step.
  const groups = ['', '', '']
  for (let i = 0; i < 84; i += 1) {
    const x = 30 + random() ** 1.3 * 520
    const base = 790 + random() * 230
    const height = 130 + random() * 260
    const lean = (random() - 0.4) * 46
    groups[i % 3] +=
      `<path d="M${n(x)},${n(base)} q${n(lean * 0.2)},${n(-height * 0.6)} ${n(lean)},${n(-height)}" stroke-width="${n(1.2 + random() * 1.8)}"/>`
  }
  const reeds = groups.map((paths, i) => `<g class="sway sway${i}">${paths}</g>`).join('')

  let pads = ''
  for (let i = 0; i < 11; i += 1) {
    const x = 40 + random() * 430
    const y = 800 + random() * 180
    const rx = 16 + random() * 26
    pads +=
      `<g class="bob bob${i % 3}"><ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * 0.3)}" fill="#1c2a24"/>` +
      `<ellipse cx="${n(x - rx * 0.15)}" cy="${n(y - rx * 0.06)}" rx="${n(rx * 0.7)}" ry="${n(rx * 0.16)}" fill="#6e7a52" opacity="0.28"/></g>`
  }

  // The right bank: a slope of earth, stones along the waterline, grass above them.
  let rocks = ''
  for (let i = 0; i < 12; i += 1) {
    const t = i / 11
    const x = 1440 - t ** 1.5 * 300 + (random() - 0.5) * 36
    const y = 712 + t * 280 + (random() - 0.5) * 14
    const rx = 24 + t * 44 + random() * 20
    const ry = rx * (0.5 + random() * 0.18)
    rocks +=
      `<ellipse cx="${n(x)}" cy="${n(y + ry * 0.75)}" rx="${n(rx * 1.02)}" ry="${n(ry * 0.4)}" fill="#07060b" opacity="0.7"/>` +
      `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="url(#rock)" transform="rotate(${n((random() - 0.5) * 18)} ${n(x)} ${n(y)})"/>`
  }
  const tufts = ['', '', '']
  for (let i = 0; i < 120; i += 1) {
    const t = random()
    const x = 1500 - t * 300 + random() * 150
    const base = 660 + t * 330 + random() * 30
    const height = 26 + random() * 70 + t * 30
    const lean = (random() - 0.65) * 40
    tufts[i % 3] +=
      `<path d="M${n(x)},${n(base)} q${n(lean * 0.3)},${n(-height * 0.6)} ${n(lean)},${n(-height)}" stroke-width="${n(1.2 + random() * 1.6)}"/>`
  }
  const grass = tufts.map((paths, i) => `<g class="sway sway${(i + 1) % 3}">${paths}</g>`).join('')

  return (
    pads +
    `<g fill="none" stroke="#0c0a10" stroke-linecap="round">${reeds}</g>` +
    `<path fill="#0b0a0f" d="M1140,${HORIZON + 5} C1300,${HORIZON + 22} 1450,${HORIZON + 58} 1462,${HORIZON + 104} C1450,790 1290,900 1120,${H} L${W + 40},${H} L${W + 40},${HORIZON + 5} Z"/>` +
    `<g filter="url(#rough2)">${rocks}</g>` +
    `<g fill="none" stroke="#10130f" stroke-linecap="round">${grass}</g>`
  )
}

const STYLE =
  '.pulse{animation:pulse 11s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.8}50%{opacity:1}}' +
  '.drift{animation:drift 150s ease-in-out infinite}.drift2{animation:drift 210s ease-in-out infinite reverse}' +
  '@keyframes drift{0%,100%{transform:translateX(-220px)}50%{transform:translateX(220px)}}' +
  '.g{transform-box:fill-box;transform-origin:center;animation:glint 4.6s ease-in-out infinite}' +
  '.g1{animation-duration:3.4s;animation-delay:-1.1s}.g2{animation-duration:5.8s;animation-delay:-2.7s}' +
  '.g3{animation-duration:4.1s;animation-delay:-3.3s}.g4{animation-duration:6.6s;animation-delay:-.6s}' +
  '.g5{animation-duration:3.9s;animation-delay:-2s}' +
  '@keyframes glint{0%,100%{opacity:.08;transform:scaleX(.55) translateX(-6px)}50%{opacity:.95;transform:scaleX(1.15) translateX(6px)}}' +
  '.sway{transform-box:fill-box;transform-origin:50% 100%;animation:sway 7s ease-in-out infinite}' +
  '.sway1{animation-duration:9s;animation-delay:-3s}.sway2{animation-duration:11s;animation-delay:-6s}' +
  '@keyframes sway{0%,100%{transform:rotate(-1.1deg)}50%{transform:rotate(1.3deg)}}' +
  '.bob{animation:bob 6s ease-in-out infinite}.bob1{animation-duration:8s;animation-delay:-2s}.bob2{animation-duration:7s;animation-delay:-4s}' +
  '@keyframes bob{0%,100%{transform:translate(0,0)}50%{transform:translate(2px,1.6px)}}' +
  '.fly{animation:fly 95s linear infinite}@keyframes fly{0%{transform:translate(-160px,40px)}100%{transform:translate(1780px,-70px)}}' +
  '@media (prefers-reduced-motion:reduce){*{animation:none!important}}'

export function lake(): string {
  const defs =
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#1a1c33"/><stop offset="0.3" stop-color="#3a3052"/>' +
    '<stop offset="0.58" stop-color="#7d4762"/><stop offset="0.8" stop-color="#d6694c"/>' +
    '<stop offset="0.93" stop-color="#f79a4a"/><stop offset="1" stop-color="#ffc56e"/></linearGradient>' +
    '<radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.95"/>' +
    '<stop offset="0.3" stop-color="#ff9a4d" stop-opacity="0.55"/><stop offset="1" stop-color="#ff7a4d" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="sunHalo"><stop offset="0" stop-color="#fff3c4"/><stop offset="0.35" stop-color="#ffd27a" stop-opacity="0.8"/>' +
    '<stop offset="1" stop-color="#ffb35a" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="streak"><stop offset="0" stop-color="#ffd09a" stop-opacity="0.75"/><stop offset="1" stop-color="#ffd09a" stop-opacity="0"/></radialGradient>' +
    noise('cDark', '0.0032 0.0105', 5, 7, [28, 27, 48], 3.1, -1.28) +
    noise('cLit', '0.003 0.017', 5, 23, [255, 150, 92], 3.6, -1.55) +
    noise('cPink', '0.0026 0.009', 4, 51, [196, 92, 122], 2.6, -1.2) +
    fade('mDark', [[0, 1], [0.6, 0.85], [0.86, 0.3], [1, 0]]) +
    fade('mLit', [[0, 0], [0.5, 0.9], [0.86, 1], [1, 0.5]]) +
    fade('mPink', [[0, 0], [0.4, 0.8], [0.8, 0.5], [1, 0]]) +
    '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f2a45a"/><stop offset="0.08" stop-color="#cf6f4c"/>' +
    '<stop offset="0.3" stop-color="#7c4560"/><stop offset="0.62" stop-color="#2f2a45"/><stop offset="1" stop-color="#111320"/></linearGradient>' +
    '<radialGradient id="column"><stop offset="0" stop-color="#ffcf80" stop-opacity="0.75"/>' +
    '<stop offset="0.4" stop-color="#ff9a52" stop-opacity="0.3"/><stop offset="1" stop-color="#ff9a52" stop-opacity="0"/></radialGradient>' +
    noise('grainLight', '0.0016 0.085', 3, 9, [255, 214, 170], 1.7, -0.92) +
    noise('grainDark', '0.002 0.06', 3, 31, [18, 16, 30], 2.0, -0.95) +
    '<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191320" stop-opacity="0.85"/><stop offset="1" stop-color="#191320" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="treeShade"><stop offset="0" stop-color="#0d0a12" stop-opacity="0.8"/><stop offset="1" stop-color="#0d0a12" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="rock" x1="0.15" y1="0" x2="0.75" y2="1"><stop offset="0" stop-color="#57444a"/>' +
    '<stop offset="0.2" stop-color="#2e2731"/><stop offset="0.6" stop-color="#1a1720"/><stop offset="1" stop-color="#0c0a10"/></linearGradient>' +
    '<filter id="rough" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" seed="4" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="30" xChannelSelector="R" yChannelSelector="G"/></filter>' +
    '<filter id="rough2" x="-6%" y="-6%" width="112%" height="112%"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="12" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>' +
    '<radialGradient id="edge" cx="0.5" cy="0.5" r="0.8"><stop offset="0.62" stop-color="#05040a" stop-opacity="0"/><stop offset="1" stop-color="#05040a" stop-opacity="0.6"/></radialGradient>'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>${defs}</defs><style>${STYLE}</style>` +
    sky() + birds() + water() + shore() + foreground() +
    `<rect width="${W}" height="${H}" fill="url(#edge)"/></svg>`
  )
}
