# handover-website

Static Astro landing page for the [`handover`](https://github.com/mohankrishnaalavala/handover) CLI.

## Stack

- Astro
- Tailwind CSS
- Cloudflare Pages
- GitHub Actions for content sync

## Local development

```bash
pnpm install
pnpm dev
```

## Content sync

The landing page keeps structured content in `src/content/`.

- `src/content/site/` is website-owned copy and layout content.
- `src/content/release/`, `src/content/features/`, `src/content/integrations/`, and `src/content/artifacts/` are refreshed by `scripts/sync-content.mjs`.

Dry-run against a local checkout of the main repo:

```bash
pnpm sync:content:dry
```

Run a real local sync:

```bash
pnpm sync:content --repo ../project_handover
```

## Deployment

This repo is intended for Cloudflare Pages Git integration.

- Build command: `pnpm build`
- Output directory: `dist`
- Branch: `main`

The `.github/workflows/sync-content.yml` workflow handles scheduled and dispatch-based content refreshes. Cloudflare Pages should redeploy automatically when that workflow pushes updated content.
