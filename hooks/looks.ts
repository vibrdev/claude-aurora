import type { ThemeColors } from 'claude-code'

import { makeColors } from './make-colors.js'
import type { SceneId } from './scenes'

export type Look = {
  id: SceneId
  label: string
  /** One line for the picker. */
  about: string
  colors: ThemeColors
  /** A line that would stop the desktop app painting the colors, if any. */
  unpainted: string | undefined
}

function look(id: SceneId, label: string, about: string, definition: Parameters<typeof makeColors>[0]): Look {
  const { theme, problems } = makeColors(definition)

  return {
    id,
    label,
    about,
    colors: theme,
    unpainted: problems.find(line => line.startsWith("Desktop won't paint")),
  }
}

// Each look is a dark scene with the whole app tinted to its hue: surfaces a few
// percent of lightness apart, text held well clear of them, and the five role
// colors kept to their meaning (red is still danger, green still success).
export const LOOKS: readonly Look[] = [
  look('dusk', 'Dusk', 'Sunset behind a plum ridge, pink and amber accents', {
    label: 'Aurora Dusk',
    only: 'dark',
    roles: { accent: '#ff7eb6', danger: '#ff5c6c', success: '#5fd6a0', warning: '#ffb454', pro: '#b794ff' },
    dark: {
      gray: {
        anchors: {
          'surface-0': '#170d24',
          'surface-1': '#1e122e',
          'surface-2': '#241636',
          'surface-3': '#29193c',
          'text-primary': '#f5ecf8',
          'text-secondary': '#d6c6e0',
          'text-muted': '#b3a0c2',
        },
      },
    },
  }),
  look('night', 'Night', 'Moon and aurora over a navy ridge, teal accents', {
    label: 'Aurora Night',
    only: 'dark',
    roles: { accent: '#4fd8c4', danger: '#ff6b7a', success: '#6ee7a0', warning: '#f5c063', pro: '#9d9bff' },
    dark: {
      gray: {
        anchors: {
          'surface-0': '#081220',
          'surface-1': '#0d1929',
          'surface-2': '#122032',
          'surface-3': '#162538',
          'text-primary': '#e9f2f7',
          'text-secondary': '#c1d0db',
          'text-muted': '#98abb9',
        },
      },
    },
  }),
]

export const DEFAULT_LOOK: SceneId = 'dusk'

export function findLook(id: unknown): Look | undefined {
  return LOOKS.find(one => one.id === id)
}

export function nextLook(id: string): Look {
  const at = LOOKS.findIndex(one => one.id === id)

  return LOOKS[(at + 1) % LOOKS.length] ?? LOOKS[0]!
}
