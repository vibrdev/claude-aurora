import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import type { Limit, Meter, Stats } from '../types'
import { DEFAULT_LOOK, LOOKS, findLook, nextLook } from './looks'
import type { Look } from './looks'
import { sceneSvg } from './scenes'

const PANE = 'aurora-session'
const PANE_TITLE = 'Session'
const LONG_TURN_MS = 90_000
const TICK_MS = 30_000
// No blur, so the scene is as sharp behind the conversation as beside it; the
// panels lay a veil of the look's own page color over it, dark enough to read on.
const GLASS = { blur: 0, opacity: 0.74 }

const NO_STATS: Stats = {
  turns: 0,
  totalMs: 0,
  lastMs: 0,
  lastTools: 0,
  lastCachedPercent: null,
  tokensIn: 0,
  tokensOut: 0,
  tokensCached: 0,
  tools: {},
  files: [],
}
const NO_METER: Meter = {
  responseAt: null,
  contextPercent: null,
  contextTokens: null,
  contextWindow: null,
  usd: null,
  limits: [],
}

const scene = atom({ plugin: 'aurora', key: 'scene' } as const, DEFAULT_LOOK as string)
const stats = atom({ plugin: 'aurora', key: 'stats' } as const, NO_STATS, { shape: 'stats-2' })
const meter = atom({ plugin: 'aurora', key: 'meter' } as const, NO_METER, { shape: 'meter-1' })
const clock = atom({ plugin: 'aurora', key: 'now' } as const, 0)
const cacheMinutes = atom({ plugin: 'aurora', key: 'cacheMinutes' } as const, 60)

function span(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return seconds % 60 === 0 ? `${minutes}m` : `${minutes}m ${seconds % 60}s`

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

/** A countdown reads in whole minutes until the last one. */
function left(ms: number): string {
  return ms >= 60_000 ? `${Math.ceil(ms / 60_000)}m` : `${Math.max(1, Math.ceil(ms / 1000))}s`
}

function count(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}k`

  return String(tokens)
}

function plural(amount: number, word: string): string {
  return `${amount} ${word}${amount === 1 ? '' : 's'}`
}

function bar(percent: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(percent / 10)))

  return '▰'.repeat(filled) + '▱'.repeat(10 - filled)
}

function clockTime(iso: string | undefined): string | undefined {
  if (iso === undefined) return undefined
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return undefined

  return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
}

function level(percent: number): 'error' | 'warning' | undefined {
  return percent >= 90 ? 'error' : percent >= 75 ? 'warning' : undefined
}

function limitName(kind: string): string {
  return kind === 'five_hour' ? '5h limit' : kind === 'seven_day' ? 'Week limit' : kind.replace(/_/g, ' ')
}

function shortPath(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)

  return parts.length <= 3 ? parts.join('/') : `…/${parts.slice(-3).join('/')}`
}

/**
 * Sends the whole look: colors, scene and glass in one call, since a set replaces
 * the theme. Resolves to why nothing draws it, or undefined when a surface does.
 * A build before 2.1.323 knows the scene as `id` and no colors, so that
 * spelling is tried second.
 */
async function paint($: EngineInterface, look: Look): Promise<string | undefined> {
  const now: ThemeSetArgs = { colors: look.colors, backdrop: { scene: look.id, glass: { ...GLASS, tint: look.veil } } }
  const before = { backdrop: { id: look.id, glass: GLASS } } as unknown as ThemeSetArgs
  let refusal = 'this build has no themes'

  for (const theme of [now, before]) {
    try {
      const set = await $.theme.set(theme)

      return set.isDrawn ? undefined : set.reason
    } catch (error) {
      refusal = error instanceof Error ? error.message : String(error)
    }
  }

  return refusal
}

async function choose($: EngineInterface, look: Look): Promise<string | undefined> {
  await update($, scene, () => look.id)
  await $.store.set('scene', look.id)

  return paint($, look)
}

/** Reads the session's own figures: context fill, rate limits, cost. */
async function measure($: EngineInterface, responded: boolean): Promise<void> {
  const now = await $.clock.now()
  let usage: Awaited<ReturnType<EngineInterface['session']['usage']>> | undefined
  try {
    usage = await $.session.usage()
  } catch {
    usage = undefined
  }
  const limits: Limit[] = (usage?.rateLimits ?? []).map(one =>
    one.resetsAt === undefined
      ? { kind: one.kind, percentUsed: one.percentUsed }
      : { kind: one.kind, percentUsed: one.percentUsed, resetsAt: one.resetsAt },
  )

  await update($, meter, was => ({
    responseAt: responded ? now : was.responseAt,
    contextPercent: usage?.context.percent ?? was.contextPercent,
    contextTokens: usage?.context.tokens ?? was.contextTokens,
    contextWindow: usage?.context.window ?? was.contextWindow,
    usd: usage?.cost?.usd ?? was.usd,
    limits: usage === undefined ? was.limits : limits,
  }))
  await update($, clock, () => now)
}

export const register: Register = on => {
  let turnTools = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scene',
      description: `Change the look: ${LOOKS.map(one => one.id).join(', ')}. No name switches to the next one.`,
      argumentHint: '[name]',
    })
    await $.command.register({
      name: 'aurora',
      description: 'Open the session panel: look, prompt cache, context, limits, tools used, files changed.',
    })

    const look = findLook(await $.store.get('scene')) ?? LOOKS[0]!
    await update($, scene, () => look.id)
    const kept = await $.store.get('cacheMinutes')
    await update($, cacheMinutes, () => (kept === 5 ? 5 : 60))
    await paint($, look)
    if (look.unpainted !== undefined) $.ui.log(look.unpainted, { to: 'debug' })

    await measure($, false)
    // The countdown redraws from this: the band reads the clock it writes.
    $.clock.every(TICK_MS, () => {
      void $.clock.now().then(now => update($, clock, () => now))
    })

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    const picked = asked === '' ? nextLook(await read($, scene)) : findLook(asked)

    if (picked === undefined) {
      return { text: `No look named "${asked}". The looks are ${LOOKS.map(one => one.id).join(', ')}.` }
    }

    const undrawn = await choose($, picked)

    return {
      text:
        undrawn === undefined
          ? `Look set to ${picked.label}.`
          : `Look set to ${picked.label}, but nothing is drawing it here: ${undrawn}`,
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
    const written =
      tool === 'Edit' || tool === 'Write' ? args.file_path : tool === 'NotebookEdit' ? args.notebook_path : undefined

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
    const used = e.usage
    const read = used?.cache_read_input_tokens ?? 0
    const input = (used?.input_tokens ?? 0) + (used?.cache_creation_input_tokens ?? 0) + read
    await update($, stats, now => ({
      ...now,
      turns: now.turns + 1,
      totalMs: now.totalMs + e.durationMs,
      lastMs: e.durationMs,
      lastTools,
      lastCachedPercent: used === undefined || input === 0 ? now.lastCachedPercent : Math.round((read / input) * 100),
      tokensIn: now.tokensIn + input,
      tokensOut: now.tokensOut + (used?.output_tokens ?? 0),
      tokensCached: now.tokensCached + read,
    }))
    // Only a turn that reached the model renews the prompt cache.
    await measure($, used !== undefined)

    if (e.durationMs >= LONG_TURN_MS && !e.isAborted) {
      $.ui.toast(`Finished in ${span(e.durationMs)}`)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    const props = e.props as unknown as { scene?: unknown; id?: unknown; plugin?: unknown }
    const look = findLook(props.scene ?? props.id)

    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || look === undefined) return next(e)
    if (typeof props.plugin === 'string' && props.plugin.split('@')[0] !== 'aurora') return next(e)

    const { Svg } = $.ui.resolve(e)

    return <Svg source={sceneSvg(look.id)} alt={`${look.label}: ${look.about}`} isInteractive />
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const session = await read($, meter)
    const turns = await read($, stats)
    const minutes = await read($, cacheMinutes)
    const now = Math.max(await read($, clock), session.responseAt ?? 0)
    const remaining = session.responseAt === null ? null : session.responseAt + minutes * 60_000 - now
    const resend = session.contextTokens === null ? '' : ` · next message re-reads ${count(session.contextTokens)}`
    const fiveHour = session.limits.find(one => one.kind === 'five_hour') ?? session.limits[0]
    const resets = clockTime(fiveHour?.resetsAt)

    return (
      <Box gap="md" alignItems="center" flexWrap="wrap">
        <Text size="caption" color="text" tabular>
          {e.props.isWorking
            ? '● Cache in use'
            : remaining === null
              ? '○ Cache not started'
              : remaining <= 0
                ? `○ Cache cold${resend}`
                : remaining <= Math.min(5, minutes / 5) * 60_000
                  ? `◐ Cache expires in ${left(remaining)}`
                  : `● Cache warm · ${left(remaining)} left`}
        </Text>
        {session.contextPercent !== null && (
          <Text size="caption" color="text" tabular>
            Context {session.contextPercent}% {bar(session.contextPercent)}
          </Text>
        )}
        {fiveHour !== undefined && (
          <Text size="caption" color="text" tabular>
            {limitName(fiveHour.kind)} {Math.round(fiveHour.percentUsed)}%{resets === undefined ? '' : ` · resets ${resets}`}
          </Text>
        )}
        {turns.turns > 0 && (
          <Text size="caption" color="text" tabular>
            {count(turns.tokensIn - turns.tokensCached + turns.tokensOut)} tokens
          </Text>
        )}
        {turns.turns > 0 && (
          <Text size="caption" color="text" tabular>
            Last turn {span(turns.lastMs)}
            {turns.lastCachedPercent === null ? '' : ` · ${turns.lastCachedPercent}% cached`}
          </Text>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const turns = await read($, stats)
    const session = await read($, meter)
    const current = await read($, scene)
    const minutes = await read($, cacheMinutes)
    const busiest = Object.entries(turns.tools)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    const calls = Object.values(turns.tools).reduce((sum, one) => sum + one, 0)
    const setCache = (value: number) => async () => {
      await update($, cacheMinutes, () => value)
      await $.store.set('cacheMinutes', value)
    }

    return (
      <Box flexDirection="column" gap="md" padding="sm">
        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Look</Text>
          <Box gap="xs" flexWrap="wrap">
            {LOOKS.map(one => (
              <Button
                key={`look-${one.id}`}
                label={one.label}
                variant={one.id === current ? 'primary' : 'secondary'}
                onPress={async () => {
                  await choose($, one)
                }}
              />
            ))}
          </Box>
          <Text dimColor size="footnote">
            {findLook(current)?.about ?? ''}
          </Text>
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Prompt cache</Text>
          <Text dimColor size="footnote">
            While the cache is warm, your next message reuses the conversation so far, which is faster and cheaper. It
            lasts this long after Claude's last reply:
          </Text>
          <Box gap="xs">
            <Button key="cache-60" label="1 hour" variant={minutes === 60 ? 'primary' : 'secondary'} onPress={setCache(60)} />
            <Button key="cache-5" label="5 minutes" variant={minutes === 5 ? 'primary' : 'secondary'} onPress={setCache(5)} />
          </Box>
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Usage</Text>
          {session.contextPercent !== null && (
            <Text tabular>
              Context {session.contextPercent}%
              {session.contextTokens === null || session.contextWindow === null
                ? ''
                : ` · ${count(session.contextTokens)} of ${count(session.contextWindow)}`}
            </Text>
          )}
          {session.limits.map(one => (
            <Text tabular color={level(one.percentUsed)}>
              {limitName(one.kind)} {Math.round(one.percentUsed)}%
              {clockTime(one.resetsAt) === undefined ? '' : ` · resets ${clockTime(one.resetsAt)}`}
            </Text>
          ))}
          <Text dimColor tabular>
            {count(turns.tokensIn)} tokens in ({turns.tokensIn === 0 ? 0 : Math.round((turns.tokensCached / turns.tokensIn) * 100)}% from
            cache) · {count(turns.tokensOut)} out
            {session.usd === null ? '' : ` · $${session.usd.toFixed(2)}`}
          </Text>
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">This session</Text>
          {turns.turns === 0 ? (
            <Text dimColor>No turns yet.</Text>
          ) : (
            <Text tabular>
              {plural(turns.turns, 'turn')} · {span(turns.totalMs)} working · {span(turns.totalMs / turns.turns)} average
            </Text>
          )}
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Tools used{calls > 0 ? ` (${calls})` : ''}</Text>
          {busiest.length === 0 && <Text dimColor>None yet.</Text>}
          {busiest.map(([tool, amount]) => (
            <Box justifyContent="space-between">
              <Text>{tool.replace(/^mcp__/, '').replace(/__/g, ' · ')}</Text>
              <Text dimColor tabular>
                {amount}
              </Text>
            </Box>
          ))}
        </Box>

        <Box flexDirection="column" gap="xs">
          <Text weight="semibold">Files changed{turns.files.length > 0 ? ` (${turns.files.length})` : ''}</Text>
          {turns.files.length === 0 && <Text dimColor>None yet.</Text>}
          {turns.files
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
