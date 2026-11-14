import { loop, move, n, seeded } from './smil'

// Lake: a sunset over still water, drawn closer to a photograph than the other
// scenes. Everything is plain shapes and gradients: the desktop app stops
// animating a scene whose markup holds a noise filter, even an unused one, and
// it redraws the backdrop without the graphics card, so blur and large moving
// areas make it stutter. The clouds are soft gradient ellipses, and what moves is
// either small (glints, birds) or moves as a few whole groups (reeds, grass).

const W = 1600
const H = 1000
const HORIZON = 600
const SUN_X = 640
const SUN_Y = HORIZON - 20

/** One layer of cloud: soft-edged ellipses scattered across a band of sky. */
function clouds(seed: number, count: number, top: number, bottom: number, size: [number, number], fill: string, opacity: number): string {
  const random = seeded(seed)
  let out = ''

  for (let i = 0; i < count; i += 1) {
    const x = random() * (W + 500) - 250
    const y = top + random() ** 1.4 * (bottom - top)
    const rx = size[0] + random() * (size[1] - size[0])
    out += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * (0.07 + random() * 0.1))}"/>`
  }

  return `<g fill="url(#${fill})" opacity="${opacity}">${out}</g>`
}

function sky(): string {
  const streak = (cx: number, cy: number, rx: number, ry: number): string =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#streak)"/>`

  return (
    `<rect width="${W}" height="${HORIZON + 2}" fill="url(#sky)"/>` +
    `<ellipse cx="${SUN_X}" cy="${HORIZON - 14}" rx="700" ry="330" fill="url(#glow)"/>` +
    clouds(51, 70, 150, 470, [70, 240], 'cPink', 0.75) +
    clouds(23, 90, 280, 555, [50, 200], 'cLit', 0.85) +
    clouds(7, 120, -30, 420, [90, 300], 'cDark', 0.95) +
    clouds(19, 50, 340, 545, [40, 140], 'cGold', 0.7) +
    // Bright streaks that drift under the deck, so the sky is never quite still.
    `<g>${streak(420, 505, 330, 7)}${streak(1150, 470, 420, 8)}${streak(1400, 380, 300, 6)}${move('translate', ['-320 0', '320 0', '-320 0'], 36)}</g>` +
    `<g>${streak(820, 540, 380, 6)}${streak(250, 440, 260, 6)}${streak(640, 330, 340, 5)}${move('translate', ['300 0', '-300 0', '300 0'], 52)}</g>` +
    `<circle cx="${SUN_X}" cy="${SUN_Y}" r="84" fill="url(#sunHalo)">${loop('r', [74, 118, 74], 5)}</circle>` +
    `<circle cx="${SUN_X}" cy="${SUN_Y}" r="21" fill="#fff8e0"/>`
  )
}

function birds(): string {
  const bird = (x: number, y: number, size: number, flap: number): string => {
    const up = `M${x},${y} q${n(size * 0.5)},${n(-size * 0.6)} ${size},0 q${n(size * 0.5)},${n(-size * 0.6)} ${size},0`
    const down = `M${x},${y} q${n(size * 0.5)},${n(size * 0.25)} ${size},0 q${n(size * 0.5)},${n(size * 0.25)} ${size},0`

    return `<path d="${up}">${loop('d', [up, down, up], flap)}</path>`
  }

  const flock = (y: number, scale: number, seconds: number, ago: number): string =>
    `<g fill="none" stroke="#17121c" stroke-width="${n(2.4 * scale)}" stroke-linecap="round">` +
    bird(0, y, 13 * scale, 0.9) + bird(46 * scale, y - 14, 10 * scale, 1.1) + bird(80 * scale, y + 16, 12 * scale, 0.8) +
    bird(128 * scale, y - 4, 9 * scale, 1) + bird(170 * scale, y + 22, 10 * scale, 0.95) +
    move('translate', ['-260 40', '1780 -70'], seconds, ago) +
    `</g>`

  return flock(250, 1, 34, 6) + flock(150, 0.7, 47, 30)
}

function shore(): string {
  const random = seeded(41)
  const far: string[] = []

  for (let x = -40; x <= W + 40; x += 12) {
    const hill = x < 420 ? 20 * Math.sin(((x + 40) / 460) * Math.PI) : 0
    far.push(`${x},${n(HORIZON - 3 - hill - random() * 7)}`)
  }
  // The stand of trees on the right bank: many small crowns packed under a rising
  // envelope, so the canopy is solid with only its edge left ragged.
  let trees = ''
  for (let i = 0; i < 260; i += 1) {
    const x = 1120 + random() * 540
    const rise = Math.max(0, (x - 1120) / 480) ** 0.7 * 290
    const y = HORIZON + 6 - random() ** 0.8 * rise
    trees += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(9 + random() * 20)}"/>`
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
    `<g fill="#0d0a12">${trees}</g>` +
    `<g fill="none" stroke="#0d0a12" stroke-width="2.4" stroke-linecap="round">${trunks}</g>` +
    // The jetty, small and far, with its posts.
    `<g fill="#0e0b13"><rect x="452" y="${HORIZON + 5}" width="128" height="4"/>` +
    [458, 486, 514, 542, 572].map(x => `<rect x="${x}" y="${HORIZON - 3}" width="2.5" height="19"/>`).join('') +
    `<rect x="452" y="${HORIZON - 4}" width="128" height="1.6"/></g>`
  )
}

function water(): string {
  const random = seeded(77)
  // Sunlight broken on the water: narrow near the horizon, wide and sparse near the
  // foot. Each glint flickers by itself, and they slide in six groups out of step.
  const groups = ['', '', '', '', '', '']

  for (let i = 0; i < 66; i += 1) {
    const t = random() ** 1.6
    const y = HORIZON + 8 + t * 380
    const spread = 14 + t * 230
    const width = 7 + t * (24 + random() * 84)
    const x = SUN_X + (random() + random() - 1) * spread - width / 2
    const period = 2.4 + random() * 3.6

    groups[i % 6] +=
      `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(1.6 + t * 3.6)}" rx="2" opacity="0.1">` +
      loop('opacity', [0.05, n(0.75 + random() * 0.25), 0.05], period, random() * period, false) +
      `</rect>`
  }
  const glints = groups
    .map((rects, i) => `<g>${rects}${move('translate', [`${-12 - i * 4} 0`, `${12 + i * 4} 0`, `${-12 - i * 4} 0`], 3 + i * 0.9, i)}</g>`)
    .join('')

  // Ripples over the whole lake, not only under the sun: thin lines of sky light
  // that slide and fade, so the water moves at the edges of the window too.
  const sets = ['', '', '', '']
  for (let i = 0; i < 32; i += 1) {
    const t = random() ** 1.3
    const y = HORIZON + 14 + t * 370
    const width = 30 + t * (60 + random() * 150)
    const period = 3 + random() * 4

    sets[i % 4] +=
      `<rect x="${n(random() * (W + 200) - 100)}" y="${n(y)}" width="${n(width)}" height="${n(1 + t * 2)}" rx="1.5" opacity="0.05">` +
      loop('opacity', [0.03, n(0.22 + random() * 0.3), 0.03], period, random() * period, false) +
      `</rect>`
  }
  const ripples = sets
    .map((rects, i) => `<g>${rects}${move('translate', [`${-40 - i * 14} 0`, `${40 + i * 14} 0`, `${-40 - i * 14} 0`], 7 + i * 2.3, i * 2)}</g>`)
    .join('')

  return (
    `<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#water)"/>` +
    `<ellipse cx="${SUN_X}" cy="${HORIZON}" rx="270" ry="430" fill="url(#column)"/>` +
    // The far shore and trees, mirrored and dimmed.
    `<rect y="${HORIZON}" width="${W}" height="16" fill="url(#shade)"/>` +
    `<ellipse cx="1420" cy="${HORIZON + 4}" rx="330" ry="150" fill="url(#treeShade)"/>` +
    `<g fill="#f3c6d2">${ripples}</g>` +
    `<g fill="#ffe2ae">${glints}</g>`
  )
}

function foreground(): string {
  const random = seeded(5)
  const blade = (x: number, base: number, height: number, lean: number, width: number): string =>
    `<path d="M${n(x)},${n(base)} q${n(lean * 0.2)},${n(-height * 0.6)} ${n(lean)},${n(-height)}" stroke-width="${n(width)}"/>`
  // A stand of blades leans as one, about the foot of the picture, like grass in a
  // light wind: one moving group instead of a hundred, which the app redraws far
  // more easily.
  const sway = (blades: string[], degrees: number, seconds: number, ago: number): string =>
    `<g transform="translate(0 ${H})"><g>` +
    move('skewX', [`${-degrees}`, `${degrees}`, `${-degrees}`], seconds, ago) +
    `<g transform="translate(0 ${-H})">${blades.join('')}</g></g></g>`

  const reeds: string[] = ['', '', '']
  for (let i = 0; i < 66; i += 1) {
    reeds[i % 3] += blade(30 + random() ** 1.3 * 520, 790 + random() * 230, 130 + random() * 260, (random() - 0.4) * 46, 1.2 + random() * 1.8)
  }

  let pads = ''
  for (let i = 0; i < 11; i += 1) {
    const x = 40 + random() * 430
    const y = 800 + random() * 180
    const rx = 16 + random() * 26
    const period = 5 + random() * 4

    pads +=
      `<g><ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(rx * 0.3)}" fill="#1c2a24"/>` +
      `<ellipse cx="${n(x - rx * 0.15)}" cy="${n(y - rx * 0.06)}" rx="${n(rx * 0.7)}" ry="${n(rx * 0.16)}" fill="#6e7a52" opacity="0.28"/>` +
      move('translate', ['-2 0', '3 2', '-2 0'], period, random() * period) +
      `</g>`
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
  const grass: string[] = ['', '']
  for (let i = 0; i < 80; i += 1) {
    const t = random()
    grass[i % 2] += blade(1500 - t * 300 + random() * 150, 660 + t * 330 + random() * 30, 26 + random() * 70 + t * 30, (random() - 0.65) * 40, 1.2 + random() * 1.6)
  }

  return (
    pads +
    `<g fill="none" stroke="#0c0a10" stroke-linecap="round">${sway([reeds[0]!], 1.6, 6, 0)}${sway([reeds[1]!], 2.2, 7.5, 2)}${sway([reeds[2]!], 1.2, 5, 4)}</g>` +
    `<path fill="#0b0a0f" d="M1140,${HORIZON + 5} C1300,${HORIZON + 22} 1450,${HORIZON + 58} 1462,${HORIZON + 104} C1450,790 1290,900 1120,${H} L${W + 40},${H} L${W + 40},${HORIZON + 5} Z"/>` +
    rocks +
    `<g fill="none" stroke="#10130f" stroke-linecap="round">${sway([grass[0]!], 1.4, 5.5, 1)}${sway([grass[1]!], 2, 7, 3)}</g>`
  )
}

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
    '<radialGradient id="streak"><stop offset="0" stop-color="#ffd09a" stop-opacity="0.8"/><stop offset="1" stop-color="#ffd09a" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="cPink"><stop offset="0" stop-color="#b45878"/><stop offset="0.45" stop-color="#b45878" stop-opacity="0.7"/><stop offset="1" stop-color="#b45878" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="cLit"><stop offset="0" stop-color="#ff9a5e"/><stop offset="0.5" stop-color="#ff9a5e" stop-opacity="0.7"/><stop offset="1" stop-color="#ff9a5e" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="cDark"><stop offset="0" stop-color="#1d1c33"/><stop offset="0.55" stop-color="#1d1c33" stop-opacity="0.7"/><stop offset="1" stop-color="#1d1c33" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="cGold"><stop offset="0" stop-color="#ffcf8f"/><stop offset="0.45" stop-color="#ffcf8f" stop-opacity="0.7"/><stop offset="1" stop-color="#ffcf8f" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f2a45a"/><stop offset="0.08" stop-color="#cf6f4c"/>' +
    '<stop offset="0.3" stop-color="#7c4560"/><stop offset="0.62" stop-color="#2f2a45"/><stop offset="1" stop-color="#111320"/></linearGradient>' +
    '<radialGradient id="column"><stop offset="0" stop-color="#ffcf80" stop-opacity="0.8"/>' +
    '<stop offset="0.4" stop-color="#ff9a52" stop-opacity="0.32"/><stop offset="1" stop-color="#ff9a52" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#191320" stop-opacity="0.85"/><stop offset="1" stop-color="#191320" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="treeShade"><stop offset="0" stop-color="#0d0a12" stop-opacity="0.8"/><stop offset="1" stop-color="#0d0a12" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="rock" x1="0.15" y1="0" x2="0.75" y2="1"><stop offset="0" stop-color="#57444a"/>' +
    '<stop offset="0.2" stop-color="#2e2731"/><stop offset="0.6" stop-color="#1a1720"/><stop offset="1" stop-color="#0c0a10"/></linearGradient>' +
    '<radialGradient id="edge" cx="0.5" cy="0.5" r="0.8"><stop offset="0.62" stop-color="#05040a" stop-opacity="0"/><stop offset="1" stop-color="#05040a" stop-opacity="0.6"/></radialGradient>'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs>${defs}</defs>` +
    sky() + birds() + water() + shore() + foreground() +
    `<rect width="${W}" height="${H}" fill="url(#edge)"/></svg>`
  )
}
