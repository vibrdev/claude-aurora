export type Stats = {
  turns: number
  totalMs: number
  lastMs: number
  lastTools: number
  tools: { [tool: string]: number }
  files: string[]
}

declare module 'claude-code' {
  interface PluginState {
    aurora: { scene: string; stats: Shaped<Stats> }
  }
}
