#!/usr/bin/env bun

import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLocalSlateTransport, createSlatesClient } from '@slates/client';
import type { SlateAuthenticationMethod, SlatesAction } from '@slates/proto';
import { $ } from 'bun';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

type IntegrationPackage = {
  directory: string;
  dirPath: string;
  packageName: string;
};

type CliOptions = {
  base: string;
  head: string;
};

type IntegrationSnapshot = {
  integration: IntegrationPackage;
  provider: Record<string, any>;
  providerName: string;
  configSchema: Record<string, any>;
  actions: SlatesAction[];
  tools: SlatesAction[];
  authMethods: SlateAuthenticationMethod[];
};

type JsonDiffEntry = {
  kind: 'added' | 'removed' | 'changed';
  path: string;
  before?: JsonValue;
  after?: JsonValue;
};

type SchemaChangeSet = {
  added: string[];
  removed: string[];
  changed: Array<{
    id: string;
    diffs: JsonDiffEntry[];
  }>;
};

type IntegrationComparison = {
  integration: IntegrationPackage;
  head: IntegrationSnapshot;
  base: IntegrationSnapshot | null;
  baseUnavailableReason?: string;
  providerDiffs: JsonDiffEntry[];
  configSchemaDiffs: JsonDiffEntry[];
  actionChanges: SchemaChangeSet;
  toolChanges: SchemaChangeSet;
  authMethodChanges: SchemaChangeSet;
};

type ValidationReport = {
  baseSha: string;
  headSha: string;
  mergeBase: string;
  changedFiles: string[];
  affectedIntegrations: IntegrationPackage[];
  comparisons: IntegrationComparison[];
};

const COMMENT_MARKER = '<!-- changed-integrations-report -->';
const INTEGRATION_ROOTS = ['integrations', 'test-integrations'] as const;
const HELP_TEXT = `
Usage:
  bun scripts/validate-pr-integrations.ts --base <git-ref> [--head <git-ref>]

Options:
  --base <git-ref>  Base ref or commit for the pull request comparison.
  --head <git-ref>  Head ref or commit to compare. Defaults to HEAD.

Environment:
  PR_BASE_SHA       Used when --base is not provided.
  PR_HEAD_SHA       Used when --head is not provided.
  PR_COMMENT_PATH   Optional file path for the generated PR comment body.
`.trim();

async function main() {
  const rootDir = path.resolve(import.meta.dir, '..');
  const options = parseArgs(process.argv.slice(2));
  const integrations = await getIntegrationPackages(rootDir);
  const { mergeBase, changedFiles, baseSha, headSha } = await getGitContext(rootDir, options);
  const affectedIntegrations = detectAffectedIntegrations(changedFiles, integrations);

  console.log(`Base SHA: ${baseSha}`);
  console.log(`Head SHA: ${headSha}`);
  console.log(`Merge base: ${mergeBase}`);
  console.log(`Changed files: ${changedFiles.length}`);

  if (changedFiles.length > 0) {
    for (const file of changedFiles) {
      console.log(`- ${file}`);
    }
  }

  if (affectedIntegrations.length === 0) {
    console.log('\nNo integrations changed in this pull request.');
    const report: ValidationReport = {
      baseSha,
      headSha,
      mergeBase,
      changedFiles,
      affectedIntegrations,
      comparisons: []
    };
    await writeOutputs(report);
    return;
  }

  console.log(
    `\nAffected integrations (${affectedIntegrations.length}): ${affectedIntegrations
      .map(integration => integration.directory)
      .join(', ')}`
  );

  console.log('\nBuilding and loading PR head integrations...');
  await buildAffectedIntegrations(rootDir, affectedIntegrations);
  const headSnapshots = await captureSnapshots(rootDir, affectedIntegrations);

  console.log(`\nChecking out temporary base worktree at ${baseSha}...`);
  const { worktreeDir, cleanup } = await createDetachedWorktree(rootDir, baseSha);

  let baseSnapshots = new Map<string, IntegrationSnapshot>();
  let baseSnapshotFailures = new Map<string, string>();
  try {
    const baseIntegrations = await getIntegrationPackages(worktreeDir);
    const baseAffected = affectedIntegrations
      .map(integration =>
        baseIntegrations.find(candidate => candidate.directory === integration.directory)
      )
      .filter((integration): integration is IntegrationPackage => integration !== undefined);

    if (baseAffected.length > 0) {
      console.log('\nInstalling dependencies in base worktree...');
      await installDependencies(worktreeDir);

      console.log('\nBuilding shared packages in base worktree...');
      await buildSharedPackages(worktreeDir);

      console.log('\nBuilding and loading base integrations...');
      const baseResult = await captureBaseSnapshots(worktreeDir, baseAffected);
      baseSnapshots = baseResult.snapshots;
      baseSnapshotFailures = baseResult.failures;
    }
  } finally {
    await cleanup();
  }

  const comparisons = affectedIntegrations.map(integration => {
    const head = requireSnapshot(headSnapshots, integration.directory, 'head');
    const base = baseSnapshots.get(integration.directory) ?? null;
    return compareSnapshots({
      integration,
      head,
      base,
      baseUnavailableReason: baseSnapshotFailures.get(integration.directory)
    });
  });

  const report: ValidationReport = {
    baseSha,
    headSha,
    mergeBase,
    changedFiles,
    affectedIntegrations,
    comparisons
  };

  await writeOutputs(report);
}

function parseArgs(args: string[]): CliOptions {
  let base = process.env.PR_BASE_SHA?.trim() ?? '';
  let head = process.env.PR_HEAD_SHA?.trim() ?? 'HEAD';

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--help' || argument === '-h') {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    if (argument === '--base') {
      base = requireArgValue(args[index + 1], '--base');
      index += 1;
      continue;
    }

    if (argument.startsWith('--base=')) {
      base = argument.slice('--base='.length);
      continue;
    }

    if (argument === '--head') {
      head = requireArgValue(args[index + 1], '--head');
      index += 1;
      continue;
    }

    if (argument.startsWith('--head=')) {
      head = argument.slice('--head='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!base) {
    throw new Error('Missing required --base argument or PR_BASE_SHA environment variable.');
  }

  return {
    base,
    head: head || 'HEAD'
  };
}

function requireArgValue(value: string | undefined, flag: string) {
  if (!value) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

async function getIntegrationPackages(rootDir: string): Promise<IntegrationPackage[]> {
  const integrations: IntegrationPackage[] = [];

  for (const root of INTEGRATION_ROOTS) {
    const integrationsDir = path.join(rootDir, root);
    if (!(await pathExists(integrationsDir))) {
      continue;
    }

    const entries = await readdir(integrationsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const dirPath = path.join(integrationsDir, entry.name);
      const packageJsonPath = path.join(dirPath, 'package.json');
      if (!(await pathExists(packageJsonPath))) {
        continue;
      }

      const manifest = (await readJson(packageJsonPath)) as {
        name?: string;
      };
      if (!manifest.name) {
        throw new Error(`Missing package name in ${packageJsonPath}.`);
      }

      integrations.push({
        directory: `${root}/${entry.name}`,
        dirPath,
        packageName: manifest.name
      });
    }
  }

  return integrations.sort((left, right) => left.directory.localeCompare(right.directory));
}

async function getGitContext(rootDir: string, options: CliOptions) {
  const [baseSha, headSha, mergeBase, diffOutput] = await Promise.all([
    $`git rev-parse ${options.base}`.cwd(rootDir).text(),
    $`git rev-parse ${options.head}`.cwd(rootDir).text(),
    $`git merge-base ${options.base} ${options.head}`.cwd(rootDir).text(),
    $`git diff --name-only --diff-filter=ACMR $(git merge-base ${options.base} ${options.head})..${options.head}`
      .cwd(rootDir)
      .text()
  ]);

  return {
    baseSha: baseSha.trim(),
    headSha: headSha.trim(),
    mergeBase: mergeBase.trim(),
    changedFiles: diffOutput
      .split('\n')
      .map(file => file.trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
  };
}

function detectAffectedIntegrations(
  changedFiles: string[],
  integrations: IntegrationPackage[]
): IntegrationPackage[] {
  const integrationsByDirectory = new Map(
    integrations.map(integration => [integration.directory, integration])
  );
  const affected = new Set<IntegrationPackage>();

  for (const file of changedFiles) {
    const parts = file.split('/');
    if (parts.length < 2) {
      continue;
    }

    const root = parts[0];
    const name = parts[1];
    if (!name || !INTEGRATION_ROOTS.includes(root as (typeof INTEGRATION_ROOTS)[number])) {
      continue;
    }

    const integration = integrationsByDirectory.get(`${root}/${name}`);
    if (integration) {
      affected.add(integration);
    }
  }

  return [...affected].sort((left, right) => left.directory.localeCompare(right.directory));
}

async function buildAffectedIntegrations(rootDir: string, integrations: IntegrationPackage[]) {
  const command = [
    'bunx',
    'turbo',
    'run',
    'build',
    '--ui=stream',
    ...integrations.map(integration => `--filter=./${integration.directory}`)
  ];

  await runCommand(command, rootDir);
}

async function captureSnapshots(rootDir: string, integrations: IntegrationPackage[]) {
  const snapshots = new Map<string, IntegrationSnapshot>();

  for (const integration of integrations) {
    const snapshot = await loadIntegrationSnapshot(rootDir, integration);
    snapshots.set(integration.directory, snapshot);
  }

  return snapshots;
}

async function captureBaseSnapshots(rootDir: string, integrations: IntegrationPackage[]) {
  try {
    await buildAffectedIntegrations(rootDir, integrations);
    return {
      snapshots: await captureSnapshots(rootDir, integrations),
      failures: new Map<string, string>()
    };
  } catch (error) {
    console.warn(
      `Base integration batch build/load failed: ${formatErrorSummary(error)}. Retrying base integrations individually.`
    );
    return captureBestEffortBaseSnapshots(rootDir, integrations);
  }
}

async function captureBestEffortBaseSnapshots(
  rootDir: string,
  integrations: IntegrationPackage[]
) {
  const snapshots = new Map<string, IntegrationSnapshot>();
  const failures = new Map<string, string>();

  for (const integration of integrations) {
    try {
      await buildAffectedIntegrations(rootDir, [integration]);
      snapshots.set(
        integration.directory,
        await loadIntegrationSnapshot(rootDir, integration)
      );
    } catch (error) {
      const reason = formatErrorSummary(error);
      failures.set(integration.directory, reason);
      console.warn(
        `Skipping base snapshot for ${integration.directory}: ${reason}. Head validation will continue.`
      );
    }
  }

  return { snapshots, failures };
}

async function loadIntegrationSnapshot(
  rootDir: string,
  integration: IntegrationPackage
): Promise<IntegrationSnapshot> {
  console.log(`\nLoading ${integration.directory} from ${rootDir}...`);

  const integrationDir = path.join(rootDir, integration.directory);
  const builtEntryPath = await resolveBuiltEntryPath(integrationDir);
  const loaded = await import(`${pathToFileURL(builtEntryPath).href}?ts=${Date.now()}`);
  const slate = resolveSlateExport(loaded, integration.directory);
  const client = createSlatesClient({
    transport: createLocalSlateTransport({ slate }),
    state: {
      config: null,
      auth: null,
      session: null
    }
  });

  try {
    const [providerResult, configSchemaResult, actionsResult, authResult] = await Promise.all([
      client.identify(),
      client.getConfigSchema(),
      client.listActions(),
      client.listAuthMethods()
    ]);

    const actions = actionsResult.actions;
    const tools = actions.filter(action => action.type === 'action.tool');
    const authMethods = authResult.authenticationMethods;
    const provider = providerResult.provider;
    const providerName = getProviderName(provider, integration);

    console.log(`Provider: ${providerName}`);
    console.log(
      `Actions (${actions.length}): ${formatNames(actions.map(action => action.id))}`
    );
    console.log(`Tools (${tools.length}): ${formatNames(tools.map(tool => tool.id))}`);
    console.log(
      `Auth methods (${authMethods.length}): ${formatNames(authMethods.map(method => method.id))}`
    );

    return {
      integration,
      provider,
      providerName,
      configSchema: configSchemaResult.schema,
      actions,
      tools,
      authMethods
    };
  } finally {
    await client.close();
  }
}

function compareSnapshots(d: {
  integration: IntegrationPackage;
  head: IntegrationSnapshot;
  base: IntegrationSnapshot | null;
  baseUnavailableReason?: string;
}): IntegrationComparison {
  return {
    integration: d.integration,
    head: d.head,
    base: d.base,
    baseUnavailableReason: d.baseUnavailableReason,
    providerDiffs: diffJson(d.base?.provider ?? null, d.head.provider, 'provider'),
    configSchemaDiffs: diffJson(
      d.base?.configSchema ?? null,
      d.head.configSchema,
      'configSchema'
    ),
    actionChanges: compareSchemasById(
      (d.base?.actions ?? []).filter(action => action.type !== 'action.tool'),
      d.head.actions.filter(action => action.type !== 'action.tool'),
      action => action.id,
      action => ({
        inputSchema: action.inputSchema,
        outputSchema: action.outputSchema
      })
    ),
    toolChanges: compareSchemasById(
      d.base?.tools ?? [],
      d.head.tools,
      tool => tool.id,
      tool => ({
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema
      })
    ),
    authMethodChanges: compareSchemasById(
      d.base?.authMethods ?? [],
      d.head.authMethods,
      method => method.id,
      method => ({
        type: method.type,
        scopes: method.scopes ?? [],
        inputSchema: method.inputSchema,
        outputSchema: method.outputSchema
      })
    )
  };
}

function compareSchemasById<T>(
  baseItems: T[],
  headItems: T[],
  getId: (item: T) => string,
  getComparableValue: (item: T) => JsonValue
): SchemaChangeSet {
  const baseMap = new Map(baseItems.map(item => [getId(item), item]));
  const headMap = new Map(headItems.map(item => [getId(item), item]));
  const added: string[] = [];
  const removed: string[] = [];
  const changed: Array<{ id: string; diffs: JsonDiffEntry[] }> = [];

  for (const id of [...headMap.keys()].sort()) {
    if (!baseMap.has(id)) {
      added.push(id);
      continue;
    }

    const diffs = diffJson(
      getComparableValue(baseMap.get(id)!),
      getComparableValue(headMap.get(id)!),
      id
    );
    if (diffs.length > 0) {
      changed.push({ id, diffs });
    }
  }

  for (const id of [...baseMap.keys()].sort()) {
    if (!headMap.has(id)) {
      removed.push(id);
    }
  }

  return {
    added,
    removed,
    changed
  };
}

async function createDetachedWorktree(rootDir: string, ref: string) {
  const worktreeDir = await mkdtemp(path.join(tmpdir(), 'integrations-base-'));
  await runCommand(['git', 'worktree', 'add', '--detach', worktreeDir, ref], rootDir);

  return {
    worktreeDir,
    cleanup: async () => {
      try {
        await runCommand(['git', 'worktree', 'remove', '--force', worktreeDir], rootDir);
      } finally {
        await rm(worktreeDir, { recursive: true, force: true });
      }
    }
  };
}

async function installDependencies(rootDir: string) {
  await runCommand(['bun', 'install'], rootDir);
}

async function buildSharedPackages(rootDir: string) {
  await runCommand(['bun', 'run', 'packages:build'], rootDir);
}

async function resolveBuiltEntryPath(dirPath: string) {
  const packageJsonPath = path.join(dirPath, 'package.json');
  const manifest = (await readJson(packageJsonPath)) as {
    main?: string;
  };

  const candidates = [
    manifest.main?.startsWith('dist/') ? manifest.main : null,
    'dist/index.js',
    'dist/index.cjs',
    'dist/index.mjs'
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of new Set(candidates)) {
    const absolutePath = path.join(dirPath, candidate);
    if (await pathExists(absolutePath)) {
      return absolutePath;
    }
  }

  throw new Error(
    `Could not find a built entrypoint in ${dirPath}. Expected a file under dist/.`
  );
}

function resolveSlateExport(loaded: Record<string, any>, integrationDirectory: string) {
  const candidates = [
    loaded.provider,
    loaded.slate,
    loaded.default?.provider,
    loaded.default?.slate,
    loaded.default?.default,
    loaded.default
  ];

  for (const candidate of candidates) {
    if (candidate && (typeof candidate === 'object' || typeof candidate === 'function')) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find a slate export in the built bundle for ${integrationDirectory}. Tried provider, slate, and default exports.`
  );
}

function requireSnapshot(
  snapshots: Map<string, IntegrationSnapshot>,
  directory: string,
  label: string
) {
  const snapshot = snapshots.get(directory);
  if (!snapshot) {
    throw new Error(`Missing ${label} snapshot for ${directory}.`);
  }

  return snapshot;
}

function getProviderName(provider: Record<string, any>, integration: IntegrationPackage) {
  return provider.name ?? provider.id ?? provider.slug ?? integration.packageName;
}

function formatNames(values: string[]) {
  return values.length === 0 ? '(none)' : values.join(', ');
}

function formatErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return (error.message || error.name).split('\n')[0] ?? error.name;
  }

  return String(error).split('\n')[0] ?? 'Unknown error';
}

async function writeOutputs(report: ValidationReport) {
  const summary = renderSummary(report);
  const comment = renderComment(report);

  console.log(`\n${summary}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, summary, 'utf-8');
  }

  if (process.env.PR_COMMENT_PATH) {
    await writeFile(process.env.PR_COMMENT_PATH, comment, 'utf-8');
  }
}

function renderSummary(report: ValidationReport) {
  const lines: string[] = [
    '## Changed integration validation',
    '',
    `- Changed files: ${report.changedFiles.length}`,
    `- Changed integrations: ${report.affectedIntegrations.length}`,
    ''
  ];

  if (report.affectedIntegrations.length === 0) {
    lines.push('No integrations were changed in this pull request.');
    return `${lines.join('\n').trimEnd()}\n`;
  }

  for (const comparison of report.comparisons) {
    lines.push(`### \`${comparison.integration.directory}\``);
    lines.push(`- Head provider: \`${comparison.head.providerName}\``);
    lines.push(`- Base provider: \`${formatBaseProviderName(comparison)}\``);
    if (comparison.baseUnavailableReason) {
      lines.push(
        '- Base snapshot: unavailable; base build/load failed, so schema diff is against an empty baseline.'
      );
    }
    lines.push(
      `- Head tools (${comparison.head.tools.length}): ${formatSummaryList(
        comparison.head.tools.map(tool => `\`${tool.id}\``)
      )}`
    );
    lines.push(
      `- Base tools (${comparison.base?.tools.length ?? 0}): ${formatSummaryList(
        (comparison.base?.tools ?? []).map(tool => `\`${tool.id}\``)
      )}`
    );
    lines.push(
      `- Head auth methods (${comparison.head.authMethods.length}): ${formatSummaryList(
        comparison.head.authMethods.map(method => `\`${method.id}\``)
      )}`
    );
    lines.push(
      `- Base auth methods (${comparison.base?.authMethods.length ?? 0}): ${formatSummaryList(
        (comparison.base?.authMethods ?? []).map(method => `\`${method.id}\``)
      )}`
    );
    lines.push(`- Schema change count: ${countSchemaChanges(comparison)}`);
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function renderComment(report: ValidationReport) {
  const lines: string[] = [
    COMMENT_MARKER,
    '## Changed Integrations Report',
    '',
    `- Changed integrations: ${report.affectedIntegrations.length}`,
    ''
  ];

  if (report.affectedIntegrations.length === 0) {
    lines.push('No integrations were changed in this pull request.');
    lines.push('');
    return `${lines.join('\n').trimEnd()}\n`;
  }

  lines.push('### Changed integrations');
  for (const integration of report.affectedIntegrations) {
    lines.push(`- \`${integration.directory}\``);
  }
  lines.push('');

  for (const comparison of report.comparisons) {
    lines.push(`<details>`);
    lines.push(`<summary><code>${comparison.integration.directory}</code></summary>`);
    lines.push('');
    lines.push(`- Head provider: \`${comparison.head.providerName}\``);
    lines.push(`- Base provider: \`${formatBaseProviderName(comparison)}\``);
    if (comparison.baseUnavailableReason) {
      lines.push(
        '- Base snapshot: unavailable; base build/load failed, so schema diff is against an empty baseline.'
      );
    }
    lines.push(
      `- Head actions (${comparison.head.actions.length}): ${formatSummaryList(
        comparison.head.actions.map(action => `\`${action.id}\``)
      )}`
    );
    lines.push(
      `- Base actions (${comparison.base?.actions.length ?? 0}): ${formatSummaryList(
        (comparison.base?.actions ?? []).map(action => `\`${action.id}\``)
      )}`
    );
    lines.push(
      `- Head tools (${comparison.head.tools.length}): ${formatSummaryList(
        comparison.head.tools.map(tool => `\`${tool.id}\``)
      )}`
    );
    lines.push(
      `- Base tools (${comparison.base?.tools.length ?? 0}): ${formatSummaryList(
        (comparison.base?.tools ?? []).map(tool => `\`${tool.id}\``)
      )}`
    );
    lines.push(
      `- Head auth methods (${comparison.head.authMethods.length}): ${formatSummaryList(
        comparison.head.authMethods.map(method => `\`${method.id}\``)
      )}`
    );
    lines.push(
      `- Base auth methods (${comparison.base?.authMethods.length ?? 0}): ${formatSummaryList(
        (comparison.base?.authMethods ?? []).map(method => `\`${method.id}\``)
      )}`
    );
    lines.push('');
    lines.push('#### Schema changes');
    appendDiffSection(lines, 'Provider metadata', comparison.providerDiffs);
    appendDiffSection(lines, 'Config schema', comparison.configSchemaDiffs);
    appendSchemaChangeSet(lines, 'Non-tool action schemas', comparison.actionChanges);
    appendSchemaChangeSet(lines, 'Tool schemas', comparison.toolChanges);
    appendSchemaChangeSet(lines, 'Auth method schemas', comparison.authMethodChanges);
    lines.push('</details>');
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function formatBaseProviderName(comparison: IntegrationComparison) {
  if (comparison.baseUnavailableReason) {
    return '(unavailable; base build/load failed)';
  }

  return comparison.base?.providerName ?? '(not present)';
}

function appendDiffSection(lines: string[], title: string, diffs: JsonDiffEntry[]) {
  if (diffs.length === 0) {
    lines.push(`- ${title}: no changes`);
    return;
  }

  lines.push(`- ${title}:`);
  for (const diff of diffs) {
    lines.push(`  - ${renderDiffEntry(diff)}`);
  }
}

function appendSchemaChangeSet(lines: string[], title: string, changes: SchemaChangeSet) {
  const hasChanges =
    changes.added.length > 0 || changes.removed.length > 0 || changes.changed.length > 0;

  if (!hasChanges) {
    lines.push(`- ${title}: no changes`);
    return;
  }

  lines.push(`- ${title}:`);

  for (const id of changes.added) {
    lines.push(`  - added \`${id}\``);
  }

  for (const id of changes.removed) {
    lines.push(`  - removed \`${id}\``);
  }

  for (const change of changes.changed) {
    lines.push(`  - changed \`${change.id}\``);
    for (const diff of change.diffs) {
      lines.push(`    - ${renderDiffEntry(diff)}`);
    }
  }
}

function renderDiffEntry(diff: JsonDiffEntry) {
  if (diff.kind === 'added') {
    return `added \`${diff.path}\` = ${formatValue(diff.after)}`;
  }

  if (diff.kind === 'removed') {
    return `removed \`${diff.path}\` (was ${formatValue(diff.before)})`;
  }

  return `changed \`${diff.path}\` from ${formatValue(diff.before)} to ${formatValue(diff.after)}`;
}

function countSchemaChanges(comparison: IntegrationComparison) {
  return (
    comparison.providerDiffs.length +
    comparison.configSchemaDiffs.length +
    comparison.actionChanges.added.length +
    comparison.actionChanges.removed.length +
    comparison.actionChanges.changed.reduce((sum, change) => sum + change.diffs.length, 0) +
    comparison.toolChanges.added.length +
    comparison.toolChanges.removed.length +
    comparison.toolChanges.changed.reduce((sum, change) => sum + change.diffs.length, 0) +
    comparison.authMethodChanges.added.length +
    comparison.authMethodChanges.removed.length +
    comparison.authMethodChanges.changed.reduce((sum, change) => sum + change.diffs.length, 0)
  );
}

function diffJson(before: unknown, after: unknown, currentPath: string): JsonDiffEntry[] {
  if (stableStringify(before) === stableStringify(after)) {
    return [];
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const diffs: JsonDiffEntry[] = [];
    const maxLength = Math.max(before.length, after.length);
    for (let index = 0; index < maxLength; index += 1) {
      const pathPart = `${currentPath}[${index}]`;
      if (index >= before.length) {
        diffs.push({ kind: 'added', path: pathPart, after: toJsonValue(after[index]) });
        continue;
      }
      if (index >= after.length) {
        diffs.push({ kind: 'removed', path: pathPart, before: toJsonValue(before[index]) });
        continue;
      }
      diffs.push(...diffJson(before[index], after[index], pathPart));
    }
    return diffs;
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const beforeRecord = before as Record<string, unknown>;
    const afterRecord = after as Record<string, unknown>;
    const keys = [
      ...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])
    ].sort();
    const diffs: JsonDiffEntry[] = [];

    for (const key of keys) {
      const pathPart = currentPath ? `${currentPath}.${key}` : key;
      const hasBefore = Object.prototype.hasOwnProperty.call(beforeRecord, key);
      const hasAfter = Object.prototype.hasOwnProperty.call(afterRecord, key);

      if (!hasBefore && hasAfter) {
        diffs.push({ kind: 'added', path: pathPart, after: toJsonValue(afterRecord[key]) });
        continue;
      }

      if (hasBefore && !hasAfter) {
        diffs.push({
          kind: 'removed',
          path: pathPart,
          before: toJsonValue(beforeRecord[key])
        });
        continue;
      }

      diffs.push(...diffJson(beforeRecord[key], afterRecord[key], pathPart));
    }

    return diffs;
  }

  return [
    {
      kind: 'changed',
      path: currentPath,
      before: toJsonValue(before),
      after: toJsonValue(after)
    }
  ];
}

function stableStringify(value: unknown) {
  return JSON.stringify(normalizeJson(value));
}

function normalizeJson(value: unknown): JsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeJson(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value as any)
        .sort()
        .map(key => [key, normalizeJson((value as Record<string, unknown>)[key])])
    );
  }

  return String(value);
}

function toJsonValue(value: unknown): JsonValue {
  return normalizeJson(value);
}

function isPlainObject(value: unknown) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatSummaryList(values: string[]) {
  return values.length === 0 ? '(none)' : values.join(', ');
}

function formatValue(value: JsonValue | undefined) {
  if (value === undefined) {
    return '`undefined`';
  }

  const rendered = JSON.stringify(value);
  if (!rendered) {
    return '`null`';
  }

  if (rendered.length <= 120) {
    return `\`${rendered}\``;
  }

  return `\`${rendered.slice(0, 117)}...\``;
}

async function runCommand(command: string[], cwd: string) {
  const proc = Bun.spawn({
    cmd: command,
    cwd,
    stdout: 'inherit',
    stderr: 'inherit'
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed with exit code ${exitCode}: ${command.join(' ')}`);
  }
}

async function readJson(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf-8'));
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function mainWithErrorHandling() {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await mainWithErrorHandling();
