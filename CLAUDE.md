# handover-website

## Goal

Build and maintain a single-page Astro landing site for the `handover` OSS CLI.
The site must present handover as universal across AI chats and coding agents,
stay fully static, and update structured product content from the main repo with
zero manual edits on release.

## Stack

- Framework: Astro
- Styling: Tailwind CSS via `@tailwindcss/vite`
- Package manager: pnpm
- Hosting: Cloudflare Pages Git integration
- Automation: GitHub Actions + `scripts/sync-content.mjs`

## Repo rules

- Keep the public repo lean.
- Do not commit `.handover/`, exported chat JSON, `PLAN.md`, `TASKS.md`, or `AGENTS.md`.
- Keep root `CLAUDE.md` and `.claude/skills/` in version control.
- `src/content/site/` is website-owned copy.
- `scripts/sync-content.mjs` may only write inside `src/content/`.
- Do not add a server runtime, database, or API routes.

## Architecture

- `src/pages/index.astro` composes the whole landing page.
- `src/layouts/BaseLayout.astro` owns metadata and global shell.
- `src/components/` contains one Astro component per section.
- `src/content.config.ts` registers content collections.
- `src/content/config.ts` owns the Zod schemas for every collection.
- `src/content/release/`, `src/content/features/`, `src/content/integrations/`,
  and `src/content/artifacts/` are generated from the main `handover` repo.

## Commands

- `pnpm dev` — local development
- `pnpm build` — production build
- `pnpm check` — Astro type/content checks
- `pnpm sync:content:dry` — preview sync against `../project_handover`
- `pnpm sync:content --repo ../project_handover` — update structured content locally

## Design direction

- Preserve the extension-derived palette:
  `#1a1a2e`, `#16213e`, `#e94560`, `#eaeaea`, `#8892b0`, `#64ffda`
- Use `Space Grotesk` for display and `IBM Plex Mono` for terminal/command text.
- No provider gets privileged placement or copy.
- The site should feel sharp and editorial, not template-like.
