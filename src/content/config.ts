import { z } from "astro/zod";

export const siteSchema = z.object({
  brand: z.object({
    name: z.string(),
    repoUrl: z.url(),
    pypiUrl: z.url(),
    changelogUrl: z.url(),
    licenseUrl: z.url(),
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
  }),
  hero: z.object({
    tagline: z.string(),
    subhead: z.string(),
    installCommand: z.string(),
    primaryCta: z.object({
      label: z.string(),
      href: z.url(),
    }),
    secondaryCta: z.object({
      label: z.string(),
      href: z.url(),
    }),
  }),
  sections: z.object({
    demo: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      command: z.string(),
      lines: z.array(z.string()),
    }),
    howItWorks: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      steps: z.array(
        z.object({
          label: z.string(),
          title: z.string(),
          description: z.string(),
        }),
      ),
    }),
    integrations: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
    }),
    artifacts: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
    }),
    quickstart: z.object({
      eyebrow: z.string(),
      title: z.string(),
      description: z.string(),
      language: z.string(),
      lines: z.array(z.string()),
    }),
  }),
  footer: z.object({
    blurb: z.string(),
    links: z.array(
      z.object({
        label: z.string(),
        href: z.url(),
      }),
    ),
  }),
});

export const integrationSchema = z.object({
  sources: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      exportLabel: z.string(),
      badge: z.string(),
    }),
  ),
  targets: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      artifactFiles: z.array(z.string()),
      badge: z.string(),
    }),
  ),
});

export const releaseSchema = z.object({
  version: z.string(),
  date: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  changelogUrl: z.url(),
});

export const featureSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
});

export const artifactSchema = z.object({
  demoTree: z.array(z.string()),
  layers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      summary: z.string(),
      entries: z.array(
        z.object({
          path: z.string(),
          description: z.string(),
        }),
      ),
    }),
  ),
});
