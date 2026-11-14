import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Stats } from '../types'
import { DEFAULT_SCENE, SCENES, findScene, nextScene, sceneSvg } from './scenes'

const NAME = 'aurora'
const PANE = 'aurora-session'
const PANE_TITLE = 'Session'
const LONG_TURN_MS = 90_000

const EMPTY: Stats = { turns: 0, totalMs: 0, lastMs: 0, lastTools: 0, tools: {}, files: [] }

const scene = atom({ plugin: 'aurora', key: 'scene' } as const, DEFAULT_SCENE)
const stats = atom({ plugin: 'aurora', key: 'stats' } as const, EMPTY, { shape: 'stats-1' })

function span(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function shortPath(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)

  return parts.length <= 3 ? parts.join('/') : `…/${parts.slice(-3).join('/')}`
}

/** Paints the scene behind the conversation. The glass keeps the app's own panel color, so text stays readable in light and dark. */
const GLASS = { blur: 28, opacity: 0.72 }

/**
 * Resolves to why nothing draws the backdrop, or undefined when a surface does.
 * Claude Code 2.1.323 renamed the backdrop's `id` to `scene` and refuses the
 * old name; earlier builds refuse the new one. So: the new spelling, then the old.
 */
async function paint($: EngineInterface, name: string): Promise<string | undefined> {
  const spellings = [{ scene: name, glass: GLASS }, { id: name, glass: GLASS }]
  let refusal = 'this build has no themes'

  for (const backdrop of spellings) {
    try {
      const set = await $.theme.set({ backdrop } as unknown as ThemeSetArgs)

      return set.isDrawn ? undefined : set.reason
    } catch (error) {
      refusal = error instanceof Error ? error.message : String(error)
    }
  }

  return refusal
}

async function choose($: EngineInterface, id: string): Promise<string | undefined> {
  await update($, scene, () => id)
  await $.store.set('scene', id)

  return paint($, id)
}

export const register: Register = on => {
  let turnTools = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scene',
      description: `Change the backdrop: ${SCENES.map(one => one.id).join(', ')}. No name switches to the next one.`,
      argumentHint: '[name]',
    })
    await $.command.register({
      name: 'aurora',
      description: 'Open the session panel: backdrop, turn times, tools used, files changed.',
    })

    const kept = findScene(await $.store.get('scene'))?.id ?? DEFAULT_SCENE
    await update($, scene, () => kept)
    await paint($, kept)

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    const picked = asked === '' ? nextScene(await read($, scene)) : findScene(asked)

    if (picked === undefined) {
      return { text: `No scene named "${asked}". The scenes are ${SCENES.map(one => one.id).join(', ')}.` }
    }

    const undrawn = await choose($, picked.id)

    return {
      text:
        undrawn === undefined
          ? `Backdrop set to ${picked.label}.`
          : `Backdrop set to ${picked.label}, but nothing is drawing it here: ${undrawn}`,
    }
  })

  on('command.run', { command: 'aurora' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: PANE_TITLE })

    return { text: opened.isPlaced ? 'Session panel opened.' : 'The session panel has no room to open here.' }
  })

  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) turnTools = 0

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    const tool = String(e.tool)
    const args = e as unknown as { file_path?: unknown; notebook_path?: unknown }
    const written = tool === 'Edit' || tool === 'Write' ? args.file_path : tool === 'NotebookEdit' ? args.notebook_path : undefined

    turnTools += 1
    await update($, stats, now => ({
      ...now,
      tools: { ...now.tools, [tool]: (now.tools[tool] ?? 0) + 1 },
      files:
        typeof written === 'string' && !now.files.includes(written) ? [...now.files, written].slice(-200) : now.files,
    }))

    return ran
  }).catch(($, e, next) => next(e)) // counting never stands in a tool call's way

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    const lastTools = turnTools
    await update($, stats, now => ({
      ...now,
      turns: now.turns + 1,
      totalMs: now.totalMs + e.durationMs,
      lastMs: e.durationMs,
      lastTools,
    }))

    if (e.durationMs >= LONG_TURN_MS && !e.isAborted) {
      $.ui.toast(`Finished in ${span(e.durationMs)}`)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const props = e.props as unknown as { scene?: unknown; id?: unknown }
    const drawn = findScene(props.scene ?? props.id)

    if (e.surface === 'terminal' || drawn === undefined || e.props.plugin.split('@')[0] !== NAME) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={sceneSvg(drawn)} alt={`${drawn.label} backdrop`} />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const now = await read($, stats)

    if (e.props.hasSurvey || now.turns === 0) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box gap="sm" alignItems="center">
        <Text dimColor size="caption" tabular>
          Last turn {span(now.lastMs)} · {plural(now.lastTools, 'tool call')} · {plural(now.files.length, 'file')}{' '}
          changed this session
        </Text>
        <Button
          key="aurora-open"
          plain
          label="Details"
          onPress={() => {
            void $.ui.open({ id: PANE, title: PANE_TITLE })
          }}
        />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const now = await read($, stats)
    const current = await read($, scene)
    const busiest = Object.entries(now.tools)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    const calls = Object.values(now.tools).reduce((sum, count) => sum + count, 0)

    return (
      <Box flexDirection="column" gap="md" padding="sm">
        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Backdrop</Text>
          <Box gap="xs" flexWrap="wrap">
            {SCENES.map(one => (
              <Button
                key={`scene-${one.id}`}
                label={one.label}
                variant={one.id === current ? 'primary' : 'secondary'}
                onPress={async () => {
                  await choose($, one.id)
                }}
              />
            ))}
          </Box>
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">This session</Text>
          {now.turns === 0 ? (
            <Text dimColor>No turns yet.</Text>
          ) : (
            <Box flexDirection="column">
              <Text tabular>
                {plural(now.turns, 'turn')} · {span(now.totalMs)} working · {span(now.totalMs / now.turns)} average
              </Text>
              <Text dimColor tabular>
                Last turn {span(now.lastMs)}, {plural(now.lastTools, 'tool call')}
              </Text>
            </Box>
          )}
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Tools used{calls > 0 ? ` (${calls})` : ''}</Text>
          {busiest.length === 0 && <Text dimColor>None yet.</Text>}
          {busiest.map(([tool, count]) => (
            <Box justifyContent="space-between">
              <Text>{tool.replace(/^mcp__/, '').replace(/__/g, ' · ')}</Text>
              <Text dimColor tabular>
                {count}
              </Text>
            </Box>
          ))}
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Files changed{now.files.length > 0 ? ` (${now.files.length})` : ''}</Text>
          {now.files.length === 0 && <Text dimColor>None yet.</Text>}
          {now.files
            .slice(-15)
            .reverse()
            .map(path => (
              <Text mono size="footnote">
                {shortPath(path)}
              </Text>
            ))}
        </Box>
      </Box>
    )
  })
}
