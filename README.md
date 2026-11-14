# Aurora

A mod for Claude Code that changes how the app looks and adds a little session awareness.

- **Backdrop.** A slowly drifting field of soft lights behind the conversation, with the app's panels frosted over it. Drawn in the desktop and mobile apps.
- **Scenes.** Aurora, Dusk, Tide, Ember and Paper. `/scene` steps to the next one, `/scene dusk` picks by name. The choice is remembered across sessions.
- **Band above the prompt.** After each turn: how long it took, how many tool calls it made, and how many files have changed this session.
- **Session panel.** `/aurora` opens a panel with the scene picker, turn count and average time, the most-used tools and the latest changed files.
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
