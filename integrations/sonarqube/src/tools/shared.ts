import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  createSonarQubeClient,
  projectKeyFor,
  requireOneProjectStatusIdentifier,
  type SonarConfig
} from '../lib/client';
import { spec } from '../spec';

export let rawRecordSchema = z
  .record(z.string(), z.any())
  .describe('Raw SonarQube response object for fields not normalized by this tool.');

export let pageSchema = z.object({
  page: z.number().optional().describe('Current 1-based page number.'),
  pageSize: z.number().optional().describe('Number of results requested per page.'),
  total: z.number().optional().describe('Total matching records reported by SonarQube.')
});

export let componentSchema = z.object({
  key: z.string().describe('SonarQube component or project key.'),
  name: z.string().optional().describe('Component display name.'),
  qualifier: z
    .string()
    .optional()
    .describe('Component qualifier, such as TRK, DIR, FIL, or UTS.'),
  path: z.string().optional().describe('Component path when SonarQube returns one.'),
  language: z.string().optional().describe('Component language when available.'),
  visibility: z.string().optional().describe('Project visibility when available.'),
  lastAnalysisDate: z.string().optional().describe('Most recent analysis timestamp.'),
  revision: z.string().optional().describe('Revision associated with the latest analysis.'),
  raw: rawRecordSchema
});

export let branchSchema = z.object({
  name: z.string().describe('Branch name.'),
  isMain: z.boolean().optional().describe('Whether this is the main branch.'),
  type: z.string().optional().describe('Branch type reported by SonarQube.'),
  status: z.string().optional().describe('Quality gate or analysis status when available.'),
  analysisDate: z.string().optional().describe('Most recent branch analysis timestamp.'),
  raw: rawRecordSchema
});

export let pullRequestSchema = z.object({
  key: z.string().describe('Pull request key or id.'),
  title: z.string().optional().describe('Pull request title.'),
  branch: z.string().optional().describe('Pull request source branch.'),
  base: z.string().optional().describe('Pull request target/base branch.'),
  status: z.string().optional().describe('Quality gate or analysis status when available.'),
  analysisDate: z.string().optional().describe('Most recent pull request analysis timestamp.'),
  url: z.string().optional().describe('Provider URL when SonarQube returns one.'),
  raw: rawRecordSchema
});

export let metricSchema = z.object({
  key: z.string().describe('Metric key.'),
  name: z.string().optional().describe('Metric display name.'),
  description: z.string().optional().describe('Metric description.'),
  domain: z.string().optional().describe('Metric domain/category.'),
  type: z.string().optional().describe('Metric value type.'),
  raw: rawRecordSchema
});

export let measureSchema = z.object({
  metric: z.string().describe('Metric key.'),
  value: z.string().optional().describe('Metric value as returned by SonarQube.'),
  bestValue: z.boolean().optional().describe('Whether this measure is at its best value.'),
  periodValue: z.string().optional().describe('New-code period value when returned.'),
  raw: rawRecordSchema
});

export let issueSchema = z.object({
  key: z.string().describe('SonarQube issue key.'),
  rule: z.string().optional().describe('Rule key that raised the issue.'),
  severity: z.string().optional().describe('Issue severity.'),
  status: z.string().optional().describe('Issue workflow status.'),
  type: z.string().optional().describe('Issue type.'),
  component: z.string().optional().describe('Component key containing the issue.'),
  project: z.string().optional().describe('Project key containing the issue.'),
  line: z.number().optional().describe('Line number when available.'),
  message: z.string().optional().describe('Issue message.'),
  author: z.string().optional().describe('SCM author when available.'),
  assignee: z.string().optional().describe('Assigned user login when available.'),
  creationDate: z.string().optional().describe('Issue creation timestamp.'),
  updateDate: z.string().optional().describe('Issue update timestamp.'),
  tags: z.array(z.string()).optional().describe('Issue tags.'),
  raw: rawRecordSchema
});

export let hotspotSchema = z.object({
  key: z.string().describe('SonarQube security hotspot key.'),
  component: z.string().optional().describe('Component key containing the hotspot.'),
  project: z.string().optional().describe('Project key containing the hotspot.'),
  line: z.number().optional().describe('Line number when available.'),
  message: z.string().optional().describe('Hotspot message.'),
  status: z.string().optional().describe('Hotspot review status.'),
  resolution: z.string().optional().describe('Hotspot review resolution when reviewed.'),
  vulnerabilityProbability: z.string().optional().describe('Vulnerability probability.'),
  ruleKey: z.string().optional().describe('Security hotspot rule key.'),
  assignee: z.string().optional().describe('Assigned user login when available.'),
  author: z.string().optional().describe('SCM author when available.'),
  creationDate: z.string().optional().describe('Hotspot creation timestamp.'),
  updateDate: z.string().optional().describe('Hotspot update timestamp.'),
  raw: rawRecordSchema
});

export let ruleSchema = z.object({
  key: z.string().describe('SonarQube rule key.'),
  name: z.string().optional().describe('Rule name.'),
  repository: z.string().optional().describe('Rule repository.'),
  language: z.string().optional().describe('Rule language key.'),
  languageName: z.string().optional().describe('Rule language name.'),
  severity: z.string().optional().describe('Rule severity.'),
  status: z.string().optional().describe('Rule status.'),
  type: z.string().optional().describe('Rule type.'),
  tags: z.array(z.string()).optional().describe('Rule tags.'),
  systemTags: z.array(z.string()).optional().describe('System rule tags.'),
  raw: rawRecordSchema
});

export let sourceLineSchema = z.object({
  line: z.number().optional().describe('Source line number.'),
  code: z.string().optional().describe('Source line text.'),
  raw: z.any().describe('Raw SonarQube source-line entry.')
});

export let scmLineSchema = z.object({
  line: z.number().optional().describe('Source line number.'),
  author: z.string().optional().describe('SCM author.'),
  date: z.string().optional().describe('SCM commit date.'),
  revision: z.string().optional().describe('SCM revision or commit hash.'),
  raw: z.any().describe('Raw SonarQube SCM entry.')
});

export let qualityGateSchema = z.object({
  id: z.string().optional().describe('Quality gate id.'),
  name: z.string().optional().describe('Quality gate name.'),
  isDefault: z.boolean().optional().describe('Whether this is the default gate.'),
  raw: rawRecordSchema
});

export let languageSchema = z.object({
  key: z.string().describe('Language key.'),
  name: z.string().optional().describe('Language name.'),
  raw: rawRecordSchema
});

export let changeSchema = z.object({
  field: z.string().optional().describe('Changed field.'),
  oldValue: z.string().optional().describe('Previous value.'),
  newValue: z.string().optional().describe('New value.'),
  raw: rawRecordSchema
});

export let historySchema = z.object({
  user: z.string().optional().describe('User who made the change.'),
  userName: z.string().optional().describe('Display name for the user who made the change.'),
  creationDate: z.string().optional().describe('Change timestamp.'),
  diffs: z.array(changeSchema).optional().describe('Field-level changes.'),
  raw: rawRecordSchema
});

export let createClient = (ctx: { auth: { token: string }; config: SonarConfig }) =>
  createSonarQubeClient({
    auth: ctx.auth,
    config: ctx.config
  });

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

let optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

let optionalBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

let optionalStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;

export let mapComponent = (component: Record<string, unknown>) => ({
  key: String(component.key ?? component.id ?? ''),
  name: optionalString(component.name),
  qualifier: optionalString(component.qualifier),
  path: optionalString(component.path),
  language: optionalString(component.language),
  visibility: optionalString(component.visibility),
  lastAnalysisDate: optionalString(component.lastAnalysisDate),
  revision: optionalString(component.revision),
  raw: component
});

export let mapBranch = (branch: Record<string, unknown>) => {
  let status =
    typeof branch.status === 'string'
      ? branch.status
      : typeof (branch.status as Record<string, unknown> | undefined)?.qualityGateStatus ===
          'string'
        ? String((branch.status as Record<string, unknown>).qualityGateStatus)
        : undefined;

  return {
    name: String(branch.name ?? ''),
    isMain: optionalBoolean(branch.isMain),
    type: optionalString(branch.type),
    status,
    analysisDate: optionalString(branch.analysisDate),
    raw: branch
  };
};

export let mapPullRequest = (pullRequest: Record<string, unknown>) => {
  let status =
    typeof pullRequest.status === 'string'
      ? pullRequest.status
      : typeof (pullRequest.status as Record<string, unknown> | undefined)
            ?.qualityGateStatus === 'string'
        ? String((pullRequest.status as Record<string, unknown>).qualityGateStatus)
        : undefined;

  return {
    key: String(pullRequest.key ?? pullRequest.id ?? ''),
    title: optionalString(pullRequest.title),
    branch: optionalString(pullRequest.branch),
    base: optionalString(pullRequest.base),
    status,
    analysisDate: optionalString(pullRequest.analysisDate),
    url: optionalString(pullRequest.url),
    raw: pullRequest
  };
};

export let mapMetric = (metric: Record<string, unknown>) => ({
  key: String(metric.key ?? ''),
  name: optionalString(metric.name),
  description: optionalString(metric.description),
  domain: optionalString(metric.domain),
  type: optionalString(metric.type),
  raw: metric
});

export let mapMeasure = (measure: Record<string, unknown>) => ({
  metric: String(measure.metric ?? ''),
  value: optionalString(measure.value),
  bestValue: optionalBoolean(measure.bestValue),
  periodValue:
    typeof measure.period === 'object' && measure.period !== null
      ? optionalString((measure.period as Record<string, unknown>).value)
      : undefined,
  raw: measure
});

export let mapIssue = (issue: Record<string, unknown>) => ({
  key: String(issue.key ?? ''),
  rule: optionalString(issue.rule),
  severity: optionalString(issue.severity),
  status: optionalString(issue.status),
  type: optionalString(issue.type),
  component: optionalString(issue.component),
  project: optionalString(issue.project),
  line: optionalNumber(issue.line),
  message: optionalString(issue.message),
  author: optionalString(issue.author),
  assignee: optionalString(issue.assignee),
  creationDate: optionalString(issue.creationDate),
  updateDate: optionalString(issue.updateDate),
  tags: optionalStringArray(issue.tags),
  raw: issue
});

export let mapHotspot = (hotspot: Record<string, unknown>) => ({
  key: String(hotspot.key ?? ''),
  component: optionalString(hotspot.component),
  project: optionalString(hotspot.project),
  line: optionalNumber(hotspot.line),
  message: optionalString(hotspot.message),
  status: optionalString(hotspot.status),
  resolution: optionalString(hotspot.resolution),
  vulnerabilityProbability: optionalString(hotspot.vulnerabilityProbability),
  ruleKey: optionalString(hotspot.ruleKey) ?? optionalString(hotspot.rule),
  assignee: optionalString(hotspot.assignee),
  author: optionalString(hotspot.author),
  creationDate: optionalString(hotspot.creationDate),
  updateDate: optionalString(hotspot.updateDate),
  raw: hotspot
});

export let mapRule = (rule: Record<string, unknown>) => ({
  key: String(rule.key ?? ''),
  name: optionalString(rule.name),
  repository: optionalString(rule.repo) ?? optionalString(rule.repository),
  language: optionalString(rule.lang) ?? optionalString(rule.language),
  languageName: optionalString(rule.langName) ?? optionalString(rule.languageName),
  severity: optionalString(rule.severity),
  status: optionalString(rule.status),
  type: optionalString(rule.type),
  tags: optionalStringArray(rule.tags),
  systemTags: optionalStringArray(rule.sysTags) ?? optionalStringArray(rule.systemTags),
  raw: rule
});

export let mapQualityGate = (gate: Record<string, unknown>) => ({
  id:
    typeof gate.id === 'string'
      ? gate.id
      : typeof gate.id === 'number'
        ? String(gate.id)
        : undefined,
  name: optionalString(gate.name),
  isDefault: optionalBoolean(gate.isDefault) ?? optionalBoolean(gate.default),
  raw: gate
});

export let mapLanguage = (language: Record<string, unknown>) => ({
  key: String(language.key ?? ''),
  name: optionalString(language.name),
  raw: language
});

export let mapHistory = (history: Record<string, unknown>) => ({
  user: optionalString(history.user),
  userName: optionalString(history.userName),
  creationDate: optionalString(history.creationDate),
  diffs: Array.isArray(history.diffs)
    ? history.diffs
        .filter(
          (diff): diff is Record<string, unknown> => typeof diff === 'object' && diff !== null
        )
        .map(diff => ({
          field: optionalString(diff.key) ?? optionalString(diff.field),
          oldValue: optionalString(diff.oldValue),
          newValue: optionalString(diff.newValue),
          raw: diff
        }))
    : undefined,
  raw: history
});

export let projectInput = {
  projectKey: z
    .string()
    .optional()
    .describe('SonarQube project key. Defaults to config.defaultProjectKey when omitted.')
};

export let branchPullRequestInputs = {
  branch: z.string().optional().describe('Branch key to query.'),
  pullRequest: z.string().optional().describe('Pull request id/key to query.')
};

export let paginationInputs = (defaultPageSize: number, maxPageSize: number) => ({
  page: z.number().optional().describe('1-based page number. Defaults to 1.'),
  pageSize: z
    .number()
    .optional()
    .describe(`Results per page. Defaults to ${defaultPageSize}; capped at ${maxPageSize}.`)
});

export let createSonarTool = (params: {
  name: string;
  key: string;
  description: string;
  instructions?: string[];
  readOnly?: boolean;
  destructive?: boolean;
}) =>
  SlateTool.create(spec, {
    name: params.name,
    key: params.key,
    description: params.description,
    instructions: params.instructions,
    tags: {
      readOnly: params.readOnly ?? true,
      destructive: params.destructive ?? false
    }
  });

export let readOnlyTool = (params: {
  name: string;
  key: string;
  description: string;
  instructions?: string[];
}) => createSonarTool(params);

export let projectKeyFromInput = (config: SonarConfig, input: { projectKey?: string }) =>
  projectKeyFor(config, input.projectKey);

export let validateProjectStatusIdentifier = (input: {
  analysisId?: string;
  projectId?: string;
  projectKey?: string;
}) => requireOneProjectStatusIdentifier(input);
