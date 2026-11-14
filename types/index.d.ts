export type Stats = {
  turns: number
  totalMs: number
  lastMs: number
  lastTools: number
  /** Share of the last turn's input the prompt cache served, 0 to 100; null before a turn reported usage. */
  lastCachedPercent: number | null
  tokensIn: number
  tokensOut: number
  tokensCached: number
  tools: { [tool: string]: number }
  files: string[]
}

export type Limit = { kind: string; percentUsed: number; resetsAt?: string }

/** What the session reported after its latest response. */
export type Meter = {
  /** When the latest main-thread turn ended, in clock milliseconds: the prompt cache counts down from here. */
  responseAt: number | null
  contextPercent: number | null
  contextTokens: number | null
  contextWindow: number | null
  usd: number | null
  limits: Limit[]
}

declare module 'claude-code' {
  interface PluginState {
    aurora: {
      scene: string
      stats: Shaped<Stats>
      meter: Shaped<Meter>
      /** The clock, written every half minute so the countdown redraws. */
      now: number
      /** How long the prompt cache is assumed to live, in minutes: 60 or 5. */
      cacheMinutes: number
    }
  }
}
