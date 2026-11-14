import { expect, test } from 'claude-code/testing'

const GLASS = { blur: 28, opacity: 0.72 }

test('session start sets the theme, and the backdrop draws on desktop and mobile', async ($, on) => {
  const sets: unknown[] = []
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('theme.set', (_, e) => {
    sets.push(e)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets.length).toBe(1)

  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({
      plugin: 'aurora',
      component: 'Backdrop',
      requestId: 'backdrop',
      surface,
      props: { id: 'aurora', plugin: 'aurora', glass: GLASS },
    })

    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})

test('the band and the pane draw after a turn', async ($, on) => {
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('store.get', () => ({ value: undefined }))
  on('theme.set', () => ({ value: { isDrawn: true, requestId: 'backdrop' } }))
  on('tool.call', () => ({ result: {} }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.turn.start({ text: 'hi', turnId: 't1' })
  await $.tool.call({ tool: 'Edit', file_path: '/a/b/c/d.ts', old_string: 'a', new_string: 'b' })
  await $.turn.complete({ answer: 'ok', durationMs: 42_000, isAborted: false, turnId: 't1', reason: 'answer' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({
      plugin: 'aurora',
      component: 'AbovePrompt',
      requestId: 'band',
      surface,
      props: {
        hasSurvey: false,
        isCollapsed: false,
        isWorking: false,
        maxRows: 10,
        bodyColumns: 80,
        scroll: { offset: 0, bodyRows: 10 },
        view: {},
      },
    })
    expect((await band.find({ type: 'Text', text: /Last turn/ }))?.text).toMatch(/42s · 1 tool call · 1 file/)
    await band.unmount()

    const pane = await $.ui.mount({
      plugin: 'aurora',
      component: 'Pane',
      requestId: 'aurora-session',
      surface,
      props: {
        title: 'Session',
        isFocused: false,
        bodyColumns: 40,
        placement: 'dock',
        scroll: { offset: 0, bodyRows: 20 },
        view: {},
      },
    })
    expect(await pane.find({ key: 'scene-dusk' })).toBeDefined()
    expect(await pane.find({ type: 'Text', text: /d\.ts/ })).toBeDefined()
    await pane.unmount()
  }
})
