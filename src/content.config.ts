import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

import {
  artifactSchema,
  featureSchema,
  integrationSchema,
  releaseSchema,
  siteSchema,
} from "./content/config";

const site = defineCollection({
  loader: glob({
    base: "./src/content/site",
    pattern: "**/*.json",
  }),
  schema: siteSchema,
});

const integrations = defineCollection({
  loader: glob({
    base: "./src/content/integrations",
    pattern: "**/*.json",
  }),
  schema: integrationSchema,
});

const release = defineCollection({
  loader: glob({
    base: "./src/content/release",
    pattern: "**/*.json",
  }),
  schema: releaseSchema,
});

const features = defineCollection({
  loader: glob({
    base: "./src/content/features",
    pattern: "**/*.json",
  }),
  schema: featureSchema,
});

const artifacts = defineCollection({
  loader: glob({
    base: "./src/content/artifacts",
    pattern: "**/*.json",
  }),
  schema: artifactSchema,
});

export const collections = {
  site,
  integrations,
  release,
  features,
  artifacts,
};
