import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'aurora',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const USAGE = {
  startedAt: 0,
  context: { tokens: 84_000, window: 200_000, percent: 42 },
  rateLimits: [{ kind: 'five_hour', percentUsed: 31.5 }],
  cost: { usd: 1.25 },
}

test('session start sends colors and scene together, and the scene draws', async ($, on) => {
  const sets: { colors?: unknown; backdrop?: { scene?: unknown } }[] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('session.usage', () => ({ value: USAGE }))
  on('theme.set', (_, e) => {
    sets.push(e as never)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets.length).toBe(1)
  expect(sets[0]?.backdrop?.scene).toBe('dusk')
  expect(sets[0]?.colors).toBeDefined()

  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({
      plugin: 'aurora',
      component: 'Backdrop',
      requestId: 'backdrop',
      surface,
      props: { scene: surface === 'desktop' ? 'lake' : 'dusk', plugin: 'aurora', glass: { blur: 6, opacity: 0.5 } } as never,
    })

    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})

test('the band counts the prompt cache down and goes cold', async ($, on) => {
  let now = 1_000_000
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('store.set', () => ({ value: undefined }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('session.usage', () => ({ value: USAGE }))
  on('clock.now', () => ({ value: now }))
  on('clock.every', () => ({ value: undefined }))
  on('tool.call', () => ({ result: {} }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  await $.tool.call({ tool: 'Edit', file_path: '/a/b/c/d.ts', old_string: 'a', new_string: 'b' })
  await $.turn.complete({
    answer: 'ok',
    durationMs: 42_000,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
    usage: {
      model: 'm',
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 9000,
      cache_creation_input_tokens: 0,
    },
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ ...BAND, surface })
    expect((await band.find({ type: 'Text', text: /Cache/ }))?.text).toBe('● Cache warm · 60m left')
    expect((await band.find({ type: 'Text', text: /Context/ }))?.text).toMatch(/Context 42% ▰▰▰▰▱▱▱▱▱▱/)
    expect((await band.find({ type: 'Text', text: /5h limit/ }))?.text).toMatch(/5h limit 32%/)
    expect((await band.find({ type: 'Text', text: /Last turn/ }))?.text).toBe('Last turn 42s · 90% cached')
    expect((await band.find({ type: 'Text', text: /tokens$/ }))?.text).toBe('2k tokens')
    await band.unmount()
  }

  // The 5-minute setting, from the panel.
  const pane = await $.ui.mount({
    plugin: 'aurora',
    component: 'Pane',
    requestId: 'aurora-session',
    surface: 'desktop',
    props: {
      title: 'Session',
      isFocused: false,
      bodyColumns: 40,
      placement: 'dock',
      scroll: { offset: 0, bodyRows: 20 },
      view: {},
    },
  })
  expect(await pane.find({ key: 'look-night' })).toBeDefined()
  expect(await pane.find({ key: 'look-lake' })).toBeDefined()
  expect(await pane.find({ type: 'Text', text: /d\.ts/ })).toBeDefined()
  await pane.press({ key: 'cache-5' })
  await pane.unmount()

  const soon = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await soon.find({ type: 'Text', text: /Cache/ }))?.text).toBe('● Cache warm · 5m left')
  await soon.unmount()
})
