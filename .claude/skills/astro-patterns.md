---
name: astro-patterns
description: Project-specific Astro patterns for the handover website
---

# astro-patterns

- Treat `src/pages/index.astro` as the composition root for the entire site.
- Keep section components in `src/components/` with typed frontmatter props.
- Pull all display content from `src/content/` collections through `astro:content`.
- Put collection schemas in `src/content/config.ts` and the Astro registration in `src/content.config.ts`.
- Keep the site static: no API routes, no server adapters, no client framework unless a real requirement appears.
- The only acceptable client-side behavior in v1 is small, isolated enhancements such as the copy-to-clipboard button.
- Prefer bold layout, large type, and deliberate spacing over generic SaaS card grids.
- The sync script may update generated content collections, but never layouts, components, or config files.
