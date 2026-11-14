export type Scene = {
  id: string
  label: string
  /** Base gradient, top-left to bottom-right. */
  base: [string, string, string]
  /** Four soft lights that drift over the base. */
  lights: [string, string, string, string]
  /** How strong the lights are at their centre, 0 to 1. */
  glow: number
}

export const SCENES: readonly Scene[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    base: ['#0b1026', '#101b3a', '#070b18'],
    lights: ['#2ee6a6', '#4f7cff', '#a855f7', '#22d3ee'],
    glow: 0.75,
  },
  {
    id: 'dusk',
    label: 'Dusk',
    base: ['#1a1033', '#3b1a4a', '#120d24'],
    lights: ['#ff7a59', '#ff4d8d', '#ffb347', '#7c5cff'],
    glow: 0.7,
  },
  {
    id: 'tide',
    label: 'Tide',
    base: ['#04202c', '#063a4a', '#03161e'],
    lights: ['#1fd1c1', '#3aa0ff', '#7ef0d0', '#1e5bd8'],
    glow: 0.7,
  },
  {
    id: 'ember',
    label: 'Ember',
    base: ['#1c1210', '#2e1711', '#100a08'],
    lights: ['#ff8a3d', '#e5484d', '#ffc46b', '#b4532a'],
    glow: 0.65,
  },
  {
    id: 'paper',
    label: 'Paper',
    base: ['#f5f1e8', '#ece5d6', '#e4dccb'],
    lights: ['#f4c9a8', '#c9d8f0', '#d9c7ee', '#cfe8d6'],
    glow: 0.9,
  },
]

export const DEFAULT_SCENE = 'aurora'

export function findScene(id: unknown): Scene | undefined {
  return SCENES.find(scene => scene.id === id)
}

export function nextScene(id: string): Scene {
  const at = SCENES.findIndex(scene => scene.id === id)

  return SCENES[(at + 1) % SCENES.length] ?? SCENES[0]!
}

// Where each light sits and how it drifts: centre, radii, the drift's far
// point and its period in seconds. Slow enough to read as weather, not motion.
const LAYOUT = [
  { cx: 320, cy: 240, rx: 720, ry: 520, dx: 180, dy: 90, scale: 1.18, seconds: 80 },
  { cx: 1320, cy: 200, rx: 640, ry: 560, dx: -160, dy: 140, scale: 1.12, seconds: 96 },
  { cx: 1180, cy: 860, rx: 760, ry: 500, dx: -200, dy: -110, scale: 1.2, seconds: 110 },
  { cx: 380, cy: 900, rx: 600, ry: 460, dx: 150, dy: -130, scale: 1.1, seconds: 72 },
] as const

/** The scene as one self-contained SVG document, sliced to fill any window. */
export function sceneSvg(scene: Scene): string {
  const gradients = scene.lights
    .map(
      (color, i) =>
        `<radialGradient id="l${i}"><stop offset="0" stop-color="${color}" stop-opacity="${scene.glow}"/>` +
        `<stop offset="0.55" stop-color="${color}" stop-opacity="${(scene.glow * 0.28).toFixed(2)}"/>` +
        `<stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
    )
    .join('')
  const frames = LAYOUT.map(
    (at, i) =>
      `@keyframes d${i}{0%,100%{transform:translate(0,0) scale(1)}` +
      `50%{transform:translate(${at.dx}px,${at.dy}px) scale(${at.scale})}}` +
      `.l${i}{animation:d${i} ${at.seconds}s ease-in-out infinite}`,
  ).join('')
  const lights = LAYOUT.map(
    (at, i) =>
      `<ellipse class="l l${i}" cx="${at.cx}" cy="${at.cy}" rx="${at.rx}" ry="${at.ry}" fill="url(#l${i})"/>`,
  ).join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="base" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${scene.base[0]}"/><stop offset="0.5" stop-color="${scene.base[1]}"/>` +
    `<stop offset="1" stop-color="${scene.base[2]}"/></linearGradient>` +
    `<radialGradient id="edge" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="${scene.base[2]}" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="${scene.base[2]}" stop-opacity="0.55"/></radialGradient>${gradients}</defs>` +
    `<style>.l{transform-box:fill-box;transform-origin:center}${frames}` +
    `@media (prefers-reduced-motion:reduce){.l{animation:none}}</style>` +
    `<rect width="1600" height="1000" fill="url(#base)"/>${lights}` +
    `<rect width="1600" height="1000" fill="url(#edge)"/></svg>`
  )
}
