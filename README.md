# Aurora

A mod for Claude Code that gives the desktop app's Code tab a full look and a bar of things worth knowing while you work. The look needs Claude Code 2.1.324 or later in the desktop or mobile app.

- **Looks.** Dusk: a sunset behind plum ridges under the first stars, with pink and amber accents. Night: a moon and slow aurora curtains over a navy ridge, with teal accents. Lake: a more photographic sunset over still water, with a lit cloud deck, glints moving on the water, swaying reeds and birds crossing, and warm orange accents. Each recolours the whole Code tab and its code highlighting to match. `/scene` switches, `/scene night` picks by name, and the choice is remembered across sessions.
- **Bar above the prompt.** A countdown to when the prompt cache expires (and how many tokens the next message would re-read once it has), how full the context window is, how much of the 5-hour limit is used and when it resets, and the last turn's time and cache hit rate.
- **Session panel.** `/aurora`: the look picker, the cache lifetime to count against (1 hour or 5 minutes), context and limits, tokens and cost, the most-used tools and the latest changed files.
- **Long-turn toast.** A "Finished in 2m 14s" toast when a turn takes over 90 seconds.

## Install

At the prompt of a terminal session:

```
/plugin install aurora --marketplace vibrdev/claude-aurora
```

Answer `y` to add the marketplace, then pick the user scope so it loads in every session.

From a shell:

```
claude plugin install aurora --marketplace vibrdev/claude-aurora
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `vibrdev/claude-aurora`, then Add plugin.

This repository is private: installing needs a GitHub account that can read it and a git credential for github.com on that machine (`gh auth login`, then `gh auth setup-git`).
