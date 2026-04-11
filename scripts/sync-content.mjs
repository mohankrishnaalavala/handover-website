#!/usr/bin/env node

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const WEBSITE_ROOT = process.cwd();
const CONTENT_ROOT = path.join(WEBSITE_ROOT, "src", "content");
const DEFAULT_REPO = "https://github.com/mohankrishnaalavala/handover.git";
const CHANGELOG_URL =
  "https://github.com/mohankrishnaalavala/handover/blob/main/CHANGELOG.md";

const SOURCE_METADATA = {
  claude: {
    name: "Claude",
    description:
      "Bulk JSONL exports, single JSON conversations, and markdown chat captures from Claude.ai.",
    exportLabel: "Settings -> Privacy -> Export Data",
    badge: "AI chat",
  },
  chatgpt: {
    name: "ChatGPT",
    description:
      "JSON exports from ChatGPT data controls, normalized into the same handover context model.",
    exportLabel: "Settings -> Data Controls -> Export Data",
    badge: "AI chat",
  },
  gemini: {
    name: "Gemini",
    description:
      "Gemini activity exports from Google Takeout with format detection handled by the parser registry.",
    exportLabel: "Google Takeout -> Gemini Apps Activity",
    badge: "AI chat",
  },
  perplexity: {
    name: "Perplexity",
    description:
      "Perplexity account exports converted into structured decisions, tasks, and constraints.",
    exportLabel: "Settings -> Account -> Export Data",
    badge: "AI chat",
  },
};

const TARGET_METADATA = {
  "claude-code": {
    name: "Claude Code",
    description:
      "Writes a thin CLAUDE.md index, PLAN.md, and the .claude workspace when the two-layer scaffold is enabled.",
    badge: "Coding agent",
  },
  codex: {
    name: "OpenAI Codex",
    description:
      "Generates AGENTS.md and TASKS.md so Codex can pick up the work with project-level context.",
    badge: "Coding agent",
  },
  copilot: {
    name: "GitHub Copilot",
    description:
      "Emits the official repository-level .github/copilot-instructions.md context file.",
    badge: "Coding agent",
  },
  aider: {
    name: "Aider",
    description:
      "Produces an .aider.conf.yml file with project conventions and the current goal.",
    badge: "Coding agent",
  },
  goose: {
    name: "Goose",
    description:
      "Creates goose-context.json so Block's Goose can ingest structured tasks and constraints.",
    badge: "Coding agent",
  },
};

const ARTIFACT_LAYER_TEMPLATE = {
  id: "handover",
  name: ".handover/",
  summary:
    "The universal layer keeps project knowledge portable across tools: overview, architecture, ADRs, constraints, risks, acceptance criteria, tasks, milestones, prompts, and codebase index files.",
  entries: [
    {
      path: "manifest.yaml",
      description: "Version, source, target, project name, and generation metadata.",
    },
    {
      path: "context/",
      description: "Overview, architecture, decisions, constraints, risks, and acceptance criteria.",
    },
    {
      path: "work/",
      description: "Specification, task list, milestones, and machine-readable backlog.",
    },
    {
      path: "standards/",
      description: "Coding, testing, security, and release rules that survive across agents.",
    },
    {
      path: "codebase/",
      description: "Structure, symbol, and dependency indexes for fast codebase orientation.",
    },
  ],
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tempDirs = [];

  try {
    const repoDir = await resolveRepo(args.repo ?? DEFAULT_REPO, args.ref, tempDirs);
    const content = await buildContent(repoDir);
    const result = await writeContent(content, args.dryRun);

    const mode = args.dryRun ? "Dry run" : "Sync";
    console.log(`${mode} completed.`);
    console.log(
      `Created: ${result.created} | Updated: ${result.updated} | Unchanged: ${result.unchanged}`,
    );
  } finally {
    await Promise.all(
      tempDirs.map(async (tempDir) => {
        await fs.rm(tempDir, { recursive: true, force: true });
      }),
    );
  }
}

function parseArgs(argv) {
  const args = {
    repo: undefined,
    ref: undefined,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--repo") {
      args.repo = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--ref") {
      args.ref = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/sync-content.mjs [options]

Options:
  --repo <path-or-url>   Local checkout or clone URL for the main handover repo
  --ref <git-ref>        Branch, tag, or commit to sync
  --dry-run              Print what would change without writing files
  --help                 Show this message`);
}

async function resolveRepo(repoInput, ref, tempDirs) {
  const localPath = path.resolve(WEBSITE_ROOT, repoInput);

  if (await exists(localPath)) {
    if (!ref) {
      return localPath;
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "handover-repo-"));
    tempDirs.push(tempDir);
    await git(["clone", "--quiet", "--no-checkout", localPath, tempDir]);
    await git(["-C", tempDir, "checkout", "--quiet", ref]);
    return tempDir;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "handover-repo-"));
  tempDirs.push(tempDir);
  await git(["clone", "--quiet", "--depth", "1", repoInput, tempDir]);

  if (ref) {
    await git(["-C", tempDir, "fetch", "--quiet", "--depth", "1", "origin", ref]);
    await git(["-C", tempDir, "checkout", "--quiet", "FETCH_HEAD"]);
  }

  return tempDir;
}

async function buildContent(repoDir) {
  const readme = await readRequired(path.join(repoDir, "README.md"));
  const changelog = await readRequired(path.join(repoDir, "CHANGELOG.md"));
  const parserRegistry = await readRequired(
    path.join(repoDir, "handover", "parsers", "__init__.py"),
  );
  const targetRegistry = await readRequired(
    path.join(repoDir, "handover", "targets", "__init__.py"),
  );

  const sourceIds = parseRegistryKeys(parserRegistry).filter((item) => item !== "claude-code");
  const targetIds = parseRegistryKeys(targetRegistry);

  const sourceTable = parseSourceExportTable(readme);
  const targets = await Promise.all(
    targetIds.map(async (targetId) => {
      const moduleName = targetId.replaceAll("-", "_");
      const moduleSource = await readRequired(
        path.join(repoDir, "handover", "targets", `${moduleName}.py`),
      );

      return buildTargetRecord(targetId, moduleSource);
    }),
  );

  return {
    integrations: {
      sources: sourceIds.map((sourceId) => buildSourceRecord(sourceId, sourceTable)),
      targets,
    },
    release: await parseLatestRelease(repoDir, changelog),
    features: {
      items: parseFeatureCards(readme, changelog),
    },
    artifacts: buildArtifactPayload(targets),
  };
}

function parseRegistryKeys(source) {
  const registryMatch = source.match(/(?:ADAPTER_REGISTRY|TARGET_REGISTRY)[^{]*=\s*\{([\s\S]*?)\n\}/m);

  if (!registryMatch) {
    throw new Error("Unable to locate registry block.");
  }

  return [...registryMatch[1].matchAll(/"([^"]+)":/g)].map((match) => match[1]);
}

function parseSourceExportTable(readme) {
  const section = extractSection(readme, "Supported Input Formats");

  if (!section) {
    return new Map();
  }

  const rows = section
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2);
  const sourceTable = new Map();

  for (const row of rows) {
    const cells = row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 3) {
      continue;
    }

    const sourceCell = cells[0];
    const exportLabel = cells[2].replaceAll("→", "->");

    if (sourceCell.toLowerCase().includes("claude")) {
      mergeSourceLabel(sourceTable, "claude", exportLabel);
      continue;
    }

    if (sourceCell.toLowerCase().includes("chatgpt")) {
      mergeSourceLabel(sourceTable, "chatgpt", exportLabel);
      continue;
    }

    if (sourceCell.toLowerCase().includes("gemini")) {
      mergeSourceLabel(sourceTable, "gemini", exportLabel);
      continue;
    }

    if (sourceCell.toLowerCase().includes("perplexity")) {
      mergeSourceLabel(sourceTable, "perplexity", exportLabel);
    }
  }

  return sourceTable;
}

function mergeSourceLabel(sourceTable, sourceId, label) {
  const previous = sourceTable.get(sourceId);

  if (!previous) {
    sourceTable.set(sourceId, label);
    return;
  }

  if (previous.includes(label)) {
    return;
  }

  sourceTable.set(sourceId, `${previous} / ${label}`);
}

function buildSourceRecord(sourceId, sourceTable) {
  const metadata = SOURCE_METADATA[sourceId];

  if (!metadata) {
    throw new Error(`No source metadata configured for ${sourceId}`);
  }

  return {
    id: sourceId,
    ...metadata,
    exportLabel: sourceTable.get(sourceId) ?? metadata.exportLabel,
  };
}

function buildTargetRecord(targetId, moduleSource) {
  const metadata = TARGET_METADATA[targetId];

  if (!metadata) {
    throw new Error(`No target metadata configured for ${targetId}`);
  }

  return {
    id: targetId,
    ...metadata,
    artifactFiles: parseTargetArtifacts(targetId, moduleSource),
  };
}

function parseTargetArtifacts(targetId, moduleSource) {
  if (targetId === "claude-code") {
    return ["CLAUDE.md", "PLAN.md", ".claude/"];
  }

  const filenames = [
    ...moduleSource.matchAll(/_[A-Z_]+_FILENAME\s*=\s*"([^"]+)"/g),
  ].map((match) => match[1]);
  const uniqueFiles = [...new Set(filenames)];

  if (targetId === "copilot" && uniqueFiles.includes("copilot-instructions.md")) {
    return uniqueFiles.map((file) =>
      file === "copilot-instructions.md" ? ".github/copilot-instructions.md" : file,
    );
  }

  return uniqueFiles;
}

async function parseLatestRelease(repoDir, changelog) {
  const releaseMatch = changelog.match(
    /^## \[(?<version>[^\]]+)\] - (?<date>\d{4}-\d{2}-\d{2})\n(?<body>[\s\S]*?)(?=^---$|^## \[|\Z)/m,
  );

  if (releaseMatch?.groups) {
    const { version, date, body } = releaseMatch.groups;
    return {
      version,
      date,
      summary: extractReleaseSummary(body, version),
      highlights: extractReleaseHighlights(body),
      changelogUrl: CHANGELOG_URL,
    };
  }

  const version = await git(["-C", repoDir, "describe", "--tags", "--abbrev=0"]);
  const date = await git(["-C", repoDir, "log", "-1", "--format=%cs", version]);

  return {
    version: version.replace(/^v/, ""),
    date,
    summary: `Latest tagged release synced from ${version}.`,
    highlights: [
      "CHANGELOG parsing fell back to the latest Git tag for version metadata.",
      "The website sync still updates integrations, features, and generated artifact data.",
      "Review CHANGELOG.md formatting if you want richer release highlights on the landing page.",
    ],
    changelogUrl: CHANGELOG_URL,
  };
}

function extractReleaseSummary(body, version) {
  const heading = body.match(/^###\s+(.+)$/m)?.[1]?.replace(/\s+/g, " ").trim();
  const remaining = heading
    ? body.slice(body.indexOf(heading) + heading.length).trim()
    : body.trim();
  const paragraph = remaining
    .split("\n\n")
    .map((block) => block.replaceAll("\n", " ").trim())
    .find((block) => block && !block.startsWith("###") && !block.startsWith("-"));

  if (paragraph) {
    return stripMarkdown(paragraph);
  }

  if (heading) {
    return stripMarkdown(`${heading} shipped in handover ${version}.`);
  }

  return `Latest release ${version} synced from the main handover repository.`;
}

function extractReleaseHighlights(body) {
  const bulletMatches = [...body.matchAll(/^- (.+)$/gm)]
    .map((match) => stripMarkdown(match[1]))
    .filter(Boolean)
    .slice(0, 3);

  if (bulletMatches.length > 0) {
    return bulletMatches;
  }

  return [...body.matchAll(/^###\s+(.+)$/gm)]
    .map((match) => stripMarkdown(match[1]))
    .filter(Boolean)
    .slice(0, 3);
}

function parseFeatureCards(readme, changelog) {
  const cards = [];

  if (readme.includes("Two-Layer Output")) {
    cards.push({
      title: "Universal knowledge base",
      description:
        "Every run creates a vendor-neutral .handover directory with architecture, decisions, constraints, tasks, milestones, prompts, and codebase indexing.",
    });
  }

  if (readme.includes("Agent-Aware Output")) {
    cards.push({
      title: "Agent-specific output",
      description:
        "The same extracted context is rendered into the file layout expected by Claude Code, Codex, Copilot, Aider, Goose, or all targets at once.",
    });
  }

  if (changelog.includes("Incremental Update")) {
    cards.push({
      title: "Incremental updates",
      description:
        "Follow-up chats can be merged into an existing handoff without wiping completed tasks or manual edits.",
    });
  }

  if (readme.includes("Supported Input Formats")) {
    cards.push({
      title: "Multiple source formats",
      description:
        "Claude, ChatGPT, Gemini, and Perplexity exports all normalize into the same project context model.",
    });
  }

  cards.push({
    title: "CLI-first workflow",
    description:
      "Use dry-run previews, grouped conversation listing, merge-by-project, browser-extension capture, and MCP tooling from one open-source package.",
  });

  return cards.slice(0, 5);
}

function buildArtifactPayload(targets) {
  const targetEntries = targets.map((target) => ({
    path: target.artifactFiles.join(" + "),
    description: target.description,
  }));

  return {
    demoTree: [
      ".handover/manifest.yaml",
      ".handover/context/overview.md",
      ".handover/work/spec.md",
      ".handover/standards/coding-standards.md",
      ".claude/agents/frontend-agent.md",
      ".claude/skills/accessibility-checklist.md",
      "CLAUDE.md",
      "PLAN.md",
    ],
    layers: [
      ARTIFACT_LAYER_TEMPLATE,
      {
        id: "agent-layer",
        name: "Agent-specific layer",
        summary:
          "Each target adapter owns its own filenames and formatting so contributors can open the result in the tool they already use without translation work.",
        entries: targetEntries,
      },
    ],
  };
}

async function writeContent(content, dryRun) {
  const writes = [
    [path.join(CONTENT_ROOT, "integrations", "index.json"), content.integrations],
    [path.join(CONTENT_ROOT, "release", "latest.json"), content.release],
    [path.join(CONTENT_ROOT, "features", "index.json"), content.features],
    [path.join(CONTENT_ROOT, "artifacts", "index.json"), content.artifacts],
  ];

  const result = {
    created: 0,
    updated: 0,
    unchanged: 0,
  };

  for (const [filePath, payload] of writes) {
    const next = `${JSON.stringify(payload, null, 2)}\n`;
    const previous = (await exists(filePath)) ? await fs.readFile(filePath, "utf8") : null;
    const relativePath = path.relative(WEBSITE_ROOT, filePath);

    if (previous === next) {
      result.unchanged += 1;
      console.log(`unchanged ${relativePath}`);
      continue;
    }

    if (previous === null) {
      result.created += 1;
      console.log(`${dryRun ? "create" : "creating"} ${relativePath}`);
    } else {
      result.updated += 1;
      console.log(`${dryRun ? "update" : "updating"} ${relativePath}`);
    }

    if (!dryRun) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, next, "utf8");
    }
  }

  return result;
}

function extractSection(markdown, heading) {
  const sectionMatch = markdown.match(
    new RegExp(`^##\\s+${escapeRegExp(heading)}\\n([\\s\\S]*?)(?=^##\\s+|\\Z)`, "m"),
  );

  return sectionMatch?.[1]?.trim() ?? null;
}

function stripMarkdown(value) {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function readRequired(filePath) {
  if (!(await exists(filePath))) {
    throw new Error(`Required source file not found: ${filePath}`);
  }

  return fs.readFile(filePath, "utf8");
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function git(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: WEBSITE_ROOT,
    maxBuffer: 8 * 1024 * 1024,
  });

  return stdout.trim();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
