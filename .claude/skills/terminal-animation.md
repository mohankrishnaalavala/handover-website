---
name: terminal-animation
description: CSS-only terminal demo rules for the handover website
---

# terminal-animation

- The terminal demo must stay CSS-only.
- Use staged line reveals with `nth-child()` timing, not a JavaScript animation library.
- Preserve the CLI feel with monospaced type, command prompt framing, and restrained motion.
- Keep the command itself readable immediately; animate the output lines, not the command input.
- Pair the dry-run log with a compact generated file tree so visitors see both extraction and output structure in one glance.
- Maintain contrast high enough for screenshots and Lighthouse accessibility checks.
