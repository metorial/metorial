import { XMLParser } from 'fast-xml-parser';
import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  getApiErrorResponse,
  getApiErrorStatus,
  getResponseHeaderValue
} from 'slates';

export type JenkinsAuth = {
  baseUrl: string;
  username: string;
  apiToken: string;
  jenkinsVersion?: string;
};

export type JenkinsConfig = {
  defaultFolderFullName?: string;
  defaultJobFullName?: string;
  maxLogLines?: number;
};

export type JenkinsRecord = Record<string, unknown>;

export type JenkinsJobSummary = {
  name?: string;
  fullName?: string;
  url?: string;
  color?: string;
  buildable?: boolean;
  jobClass?: string;
  isFolder: boolean;
  raw: JenkinsRecord;
};

export type JenkinsBuildSelector =
  | 'number'
  | 'lastBuild'
  | 'lastCompletedBuild'
  | 'lastSuccessfulBuild'
  | 'lastFailedBuild';

export type JenkinsBuildParameterScalar = string | number | boolean;
export type JenkinsBuildParameters = Record<
  string,
  JenkinsBuildParameterScalar | JenkinsBuildParameterScalar[]
>;

export type JenkinsLogChunk = {
  text: string;
  start: number;
  nextStart?: number;
  moreData: boolean;
  progressive: boolean;
};

export type JenkinsBuildLogPage = {
  buildNumber: number;
  lines: string[];
  hasMoreContent: boolean;
  startLine: number;
  endLine: number;
  totalLines: number;
  nextCursor?: string;
};

export type JenkinsScmSummary = {
  scmClasses: string[];
  urls: string[];
  branches: string[];
  credentialsIds: string[];
};

export type JenkinsGitScmConfig = {
  name: 'Git';
  uris: string[];
  branches: string[];
  commit: string | null;
};

export type JenkinsGitScmMatchTarget = {
  uri: string;
  repositoryName: string;
  branchSpecs: string[];
};

export type JenkinsBuildChange = {
  commitId?: string;
  message?: string;
  timestamp?: number;
  authorName?: string;
  authorEmail?: string;
  affectedPaths: string[];
  raw?: JenkinsRecord;
};

export type JenkinsBuildChangeSet = {
  kind?: string;
  itemCount: number;
  items: JenkinsBuildChange[];
  raw?: JenkinsRecord;
};

export type JenkinsReplayScripts = {
  buildNumber: number;
  mainScript: string;
  loadedScripts: Record<string, string>;
};

export type JenkinsReplayBuildResult = {
  sourceBuildNumber: number;
  queueId?: number;
  queueUrl?: string;
  redirectUrl?: string;
  location?: string;
  queueItem?: JenkinsRecord;
};

let xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text'
});

export let isRecord = (value: unknown): value is JenkinsRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let asRecord = (value: unknown): JenkinsRecord => (isRecord(value) ? value : {});

export let asString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

export let asNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export let asBoolean = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

export let asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export let jenkinsValidationError = (message: string) =>
  createApiServiceError(message, { reason: 'jenkins_validation_error' });

export let jenkinsApiError = (error: unknown, operation = 'request') =>
  buildApiServiceError(error, {
    providerLabel: 'Jenkins',
    operation,
    reason: 'jenkins_api_error',
    detailKeys: ['message', 'error', 'detail', 'reason'],
    nestedKeys: ['errors', 'causes'],
    extractMessage: (input, helpers) => {
      let response = helpers.getResponse(input);
      let responseText =
        typeof response?.data === 'string' ? stripHtml(response.data).trim() : undefined;
      if (responseText) return responseText.slice(0, 500);
      if (input instanceof Error && input.message) return input.message;
      return undefined;
    },
    extractStatus: input => getJenkinsErrorStatus(input)
  });

export let normalizeBaseUrl = (baseUrl: string) => {
  let trimmed = baseUrl.trim();
  if (!trimmed) {
    throw jenkinsValidationError('baseUrl is required.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw jenkinsValidationError('baseUrl must be a valid Jenkins URL.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw jenkinsValidationError('baseUrl must use http or https.');
  }

  parsed.hash = '';
  parsed.search = '';
  return parsed.toString().replace(/\/+$/, '');
};

let normalizeRequiredAuthString = (value: string, label: string) => {
  let trimmed = value.trim();
  if (!trimmed) {
    throw jenkinsValidationError(`${label} is required.`);
  }
  return trimmed;
};

export let normalizeJenkinsAuth = (auth: JenkinsAuth): JenkinsAuth => {
  let normalized: JenkinsAuth = {
    baseUrl: normalizeBaseUrl(auth.baseUrl),
    username: normalizeRequiredAuthString(auth.username, 'username'),
    apiToken: normalizeRequiredAuthString(auth.apiToken, 'apiToken')
  };

  if (auth.jenkinsVersion !== undefined) {
    normalized.jenkinsVersion = auth.jenkinsVersion;
  }

  return normalized;
};

export let encodeJobPath = (fullName: string) => {
  let parts = fullName
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw jenkinsValidationError('Jenkins job full name cannot be empty.');
  }

  return parts.map(part => `/job/${encodeURIComponent(part)}`).join('');
};

export let parseQueueIdFromLocation = (location: string | undefined) => {
  if (!location) return undefined;
  let match = location.match(/\/queue\/item\/(\d+)\/?$/);
  return match?.[1] ? Number(match[1]) : undefined;
};

export let jobFullNameFromInput = (
  config: JenkinsConfig | undefined,
  jobFullName: string | undefined
) => {
  let value = jobFullName?.trim() || config?.defaultJobFullName?.trim();
  if (!value) {
    throw jenkinsValidationError(
      'jobFullName is required. Provide jobFullName input or configure defaultJobFullName.'
    );
  }
  return value;
};

export let folderFullNameFromInput = (
  config: JenkinsConfig | undefined,
  folderFullName: string | undefined
) => folderFullName?.trim() || config?.defaultFolderFullName?.trim() || undefined;

export let resolveMaxLogLines = (
  config: JenkinsConfig | undefined,
  maxLines: number | undefined
) => {
  let value = maxLines ?? config?.maxLogLines ?? 10000;
  if (!Number.isFinite(value) || value < 1) {
    throw jenkinsValidationError('maxLines must be a positive number.');
  }
  return Math.min(Math.floor(value), 100000);
};

export let normalizeLimit = (
  value: number | undefined,
  defaultValue: number,
  maxValue: number,
  label: string
) => {
  if (value === undefined) return defaultValue;
  if (!Number.isFinite(value) || value < 1) {
    throw jenkinsValidationError(`${label} must be a positive number.`);
  }
  return Math.min(Math.floor(value), maxValue);
};

export let normalizeSkip = (value: number | undefined, label = 'skip') => {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0) {
    throw jenkinsValidationError(`${label} must be a non-negative number.`);
  }
  return Math.floor(value);
};

let serializeParams = (params: Record<string, unknown>) => {
  let search = new URLSearchParams();

  for (let [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;

    if (Array.isArray(value)) {
      for (let item of value) {
        if (item !== undefined && item !== null && item !== '') {
          search.append(key, String(item));
        }
      }
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

let stripHtml = (value: string) =>
  value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

let decodeHtmlEntities = (value: string) =>
  value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      let point = Number.parseInt(code, 16);
      return Number.isFinite(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : _;
    })
    .replace(/&#(\d+);/g, (_, code: string) => {
      let point = Number.parseInt(code, 10);
      return Number.isFinite(point) && point >= 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : _;
    });

let uniqueStrings = (values: Iterable<string>) => [
  ...new Set([...values].filter(value => value.length > 0))
];

let maybeNumberFromHeader = (value: string | undefined) => {
  if (!value) return undefined;
  let parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

let getJenkinsErrorStatus = (error: unknown) => {
  let normalizeStatus = (status: unknown): number | string | undefined => {
    if (typeof status === 'number') return status;
    if (typeof status === 'string') {
      return /^\d+$/.test(status) ? Number(status) : status;
    }
    return undefined;
  };

  let status = normalizeStatus(getApiErrorStatus(error));
  if (status !== undefined) return status;

  let serviceErrorData = asRecord(asRecord(error).data);
  for (let candidate of [serviceErrorData.upstreamStatus, serviceErrorData.status]) {
    let serviceStatus = normalizeStatus(candidate);
    if (typeof serviceStatus === 'number' || typeof serviceStatus === 'string') {
      return serviceStatus;
    }
  }

  let directStatus = normalizeStatus(asRecord(error).status);
  return typeof directStatus === 'number' || typeof directStatus === 'string'
    ? directStatus
    : undefined;
};

let encodeBuildLogCursor = (buildNumber: number, byteOffset: number) =>
  Buffer.from(`${buildNumber}:${byteOffset}`, 'ascii').toString('base64url');

let decodeBuildLogCursor = (cursor: string, expectedBuildNumber: number) => {
  if (!/^[A-Za-z0-9_-]+$/.test(cursor)) {
    throw jenkinsValidationError('Invalid cursor.');
  }

  let raw: string;
  try {
    raw = Buffer.from(cursor, 'base64url').toString('ascii');
  } catch {
    throw jenkinsValidationError('Invalid cursor.');
  }

  let match = raw.match(/^(\d+):(\d+)$/);
  if (!match) {
    throw jenkinsValidationError('Invalid cursor.');
  }

  let buildNumber = Number(match[1]);
  let byteOffset = Number(match[2]);
  if (!Number.isSafeInteger(buildNumber) || !Number.isSafeInteger(byteOffset)) {
    throw jenkinsValidationError('Invalid cursor.');
  }
  if (buildNumber !== expectedBuildNumber) {
    throw jenkinsValidationError(
      `Cursor was issued for build #${buildNumber}, but build #${expectedBuildNumber} was requested.`
    );
  }

  return byteOffset;
};

let splitLogLines = (text: string) => {
  let lines: { text: string; byteLength: number }[] = [];
  let lineStart = 0;
  let newlinePattern = /\r\n|\n|\r/g;

  for (let match of text.matchAll(newlinePattern)) {
    let index = match.index ?? 0;
    let newline = match[0] ?? '';
    let segmentEnd = index + newline.length;
    let segment = text.slice(lineStart, segmentEnd);
    lines.push({
      text: text.slice(lineStart, index),
      byteLength: Buffer.byteLength(segment, 'utf8')
    });
    lineStart = segmentEnd;
  }

  if (lineStart < text.length) {
    let segment = text.slice(lineStart);
    lines.push({
      text: segment,
      byteLength: Buffer.byteLength(segment, 'utf8')
    });
  }

  return lines;
};

let truncateLogTextToMaxLines = (text: string, maxLines: number) => {
  let lineCount = 0;
  let newlinePattern = /\r\n|\n|\r/g;

  for (let match of text.matchAll(newlinePattern)) {
    lineCount += 1;
    if (lineCount >= maxLines) {
      let end = (match.index ?? 0) + (match[0]?.length ?? 0);
      if (end < text.length) {
        let truncatedText = text.slice(0, end);
        return {
          text: truncatedText,
          truncated: true,
          byteLength: Buffer.byteLength(truncatedText, 'utf8')
        };
      }
    }
  }

  return {
    text,
    truncated: false,
    byteLength: Buffer.byteLength(text, 'utf8')
  };
};

let appendBuildParameter = (params: URLSearchParams, key: string, value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    params.append(key, String(value));
    return;
  }

  throw jenkinsValidationError(
    `Build parameter "${key}" must be a string, number, boolean, or an array of those values.`
  );
};

let serializeBuildParameters = (parameters: Record<string, unknown> | undefined) => {
  if (!parameters || Object.keys(parameters).length === 0) return undefined;

  let params = new URLSearchParams();
  for (let [key, value] of Object.entries(parameters)) {
    if (!key.trim()) {
      throw jenkinsValidationError('Build parameter names cannot be empty.');
    }

    if (Array.isArray(value)) {
      for (let item of value) appendBuildParameter(params, key, item);
      continue;
    }

    appendBuildParameter(params, key, value);
  }

  return params.toString();
};

let shouldRetryWithCrumb = (error: unknown) => {
  let status = getJenkinsErrorStatus(error);
  if (status !== 403 && status !== 401) return false;

  let data = getApiErrorResponse(error)?.data;
  if (typeof data !== 'string') return true;
  return /crumb|csrf|no valid crumb/i.test(data);
};

let isMissingOrUnsupported = (error: unknown) => {
  let status = getJenkinsErrorStatus(error);
  return status === 404 || status === 405 || status === 501;
};

let jobClassFromRecord = (record: JenkinsRecord) =>
  asString(record._class) ?? asString(record.class);

let compareJobSummariesByName = (left: JenkinsJobSummary, right: JenkinsJobSummary) => {
  let nameOrder = (left.name ?? '').localeCompare(right.name ?? '');
  if (nameOrder !== 0) return nameOrder;
  return (left.fullName ?? '').localeCompare(right.fullName ?? '');
};

export let isFolderJobRecord = (record: JenkinsRecord) => {
  let jobClass = jobClassFromRecord(record)?.toLowerCase() ?? '';
  return jobClass.includes('folder') || Array.isArray(record.jobs);
};

export let mapJobSummary = (record: JenkinsRecord): JenkinsJobSummary => ({
  name: asString(record.name),
  fullName:
    asString(record.fullName) ?? asString(record.fullDisplayName) ?? asString(record.name),
  url: asString(record.url),
  color: asString(record.color),
  buildable: asBoolean(record.buildable),
  jobClass: jobClassFromRecord(record),
  isFolder: isFolderJobRecord(record),
  raw: record
});

export let parseBuildSelectorPath = (
  buildSelector: JenkinsBuildSelector | undefined,
  buildNumber: number | undefined
) => {
  if (buildNumber !== undefined && (!Number.isFinite(buildNumber) || buildNumber < 1)) {
    throw jenkinsValidationError('buildNumber must be a positive number.');
  }

  if (buildSelector === undefined) {
    return buildNumber !== undefined ? String(Math.floor(buildNumber)) : 'lastBuild';
  }

  let selector = buildSelector;
  if (selector === 'number') {
    if (buildNumber === undefined) {
      throw jenkinsValidationError('buildNumber is required when buildSelector is number.');
    }
    return String(Math.floor(buildNumber));
  }

  if (buildNumber !== undefined) {
    throw jenkinsValidationError(
      'buildNumber can only be used when buildSelector is number or omitted.'
    );
  }

  return selector;
};

let normalizeBuildParameterValue = (
  name: string,
  value: unknown
): JenkinsBuildParameters[string] | undefined => {
  if (value === undefined || value === null) return undefined;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        return item;
      }

      throw jenkinsValidationError(
        `Build parameter "${name}" contains a value type that Jenkins REST buildWithParameters cannot preserve.`
      );
    });
  }

  throw jenkinsValidationError(
    `Build parameter "${name}" has a value type that Jenkins REST buildWithParameters cannot preserve.`
  );
};

let buildParameterValues = (build: JenkinsRecord) => {
  let parameters: JenkinsBuildParameters = {};
  for (let action of asArray(build.actions)) {
    let actionRecord = asRecord(action);
    for (let parameter of asArray(actionRecord.parameters)) {
      let record = asRecord(parameter);
      let name = asString(record.name);
      if (!name) continue;
      let value = normalizeBuildParameterValue(name, record.value);
      if (value !== undefined) parameters[name] = value;
    }
  }
  return parameters;
};

let readHtmlAttribute = (attributes: string, name: string) => {
  let pattern = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  let match = attributes.match(pattern);
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '') : undefined;
};

let normalizeReplayFieldName = (name: string) => {
  let trimmed = name.trim();
  return trimmed.startsWith('_.') ? trimmed.slice(2) : trimmed;
};

let replayLoadedScriptFieldName = (name: string) => name.replace(/\./g, '_');

let serializeReplayForm = (
  mainScript: string,
  loadedScripts: Record<string, string> | undefined
) => {
  let form: Record<string, string> = { mainScript };

  for (let [name, script] of Object.entries(loadedScripts ?? {})) {
    let trimmedName = name.trim();
    if (!trimmedName) {
      throw jenkinsValidationError('Loaded script names cannot be empty.');
    }
    if (typeof script !== 'string') {
      throw jenkinsValidationError(`Loaded script "${trimmedName}" content must be a string.`);
    }

    let fieldName = replayLoadedScriptFieldName(trimmedName);
    if (Object.hasOwn(form, fieldName)) {
      throw jenkinsValidationError(
        `Loaded script "${trimmedName}" maps to duplicate Jenkins replay field "${fieldName}".`
      );
    }
    form[fieldName] = script;
  }

  let params = new URLSearchParams();
  for (let [fieldName, value] of Object.entries(form)) {
    params.set(fieldName, value);
  }
  params.set('json', JSON.stringify(form));
  return params;
};

let resolveLocationUrl = (baseUrl: string, path: string, location: string | undefined) => {
  if (!location) return undefined;
  try {
    return new URL(location, `${baseUrl}${path}`).toString();
  } catch {
    return location;
  }
};

let extractReplayRunFormHtml = (html: string) => {
  let formPattern = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
  for (let match of html.matchAll(formPattern)) {
    let attributes = match[1] ?? '';
    let action = readHtmlAttribute(attributes, 'action') ?? '';
    let name = readHtmlAttribute(attributes, 'name') ?? '';
    if (name === 'config' || /(?:^|\/)run(?:[?#].*)?$/.test(action)) {
      return match[2] ?? '';
    }
  }
  return undefined;
};

let hasReplayRebuildForm = (html: string) => {
  let formPattern = /<form\b([^>]*)>/gi;
  for (let match of html.matchAll(formPattern)) {
    let attributes = match[1] ?? '';
    let action = readHtmlAttribute(attributes, 'action') ?? '';
    let name = readHtmlAttribute(attributes, 'name') ?? '';
    if (name === 'rebuild' || /(?:^|\/)rebuild(?:[?#].*)?$/.test(action)) {
      return true;
    }
  }
  return false;
};

let labelBeforeTextarea = (html: string, textareaIndex: number) => {
  let before = html.slice(Math.max(0, textareaIndex - 3000), textareaIndex);
  let labelPattern =
    /<div\b[^>]*\bclass\s*=\s*["'][^"']*\bjenkins-form-label\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let label: string | undefined;
  for (let match of before.matchAll(labelPattern)) {
    label = decodeHtmlEntities(stripHtml(match[1] ?? '').trim());
  }
  return label;
};

export let extractReplayScriptsFromHtml = (
  html: string
): { mainScript: string; loadedScripts: Record<string, string> } | undefined => {
  let formHtml = extractReplayRunFormHtml(html);
  if (formHtml === undefined) return undefined;

  let textareas: {
    fieldName: string;
    label?: string;
    script: string;
  }[] = [];
  let textareaPattern = /<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/gi;

  for (let match of formHtml.matchAll(textareaPattern)) {
    let rawName = readHtmlAttribute(match[1] ?? '', 'name');
    if (!rawName) continue;
    textareas.push({
      fieldName: normalizeReplayFieldName(rawName),
      label: labelBeforeTextarea(formHtml, match.index ?? 0),
      script: decodeHtmlEntities(match[2] ?? '')
    });
  }

  let main = textareas.find(textarea => textarea.fieldName === 'mainScript');
  if (!main) return undefined;

  let loadedScripts: Record<string, string> = {};
  for (let textarea of textareas) {
    if (textarea === main) continue;
    let key =
      textarea.label && !/^main script$/i.test(textarea.label)
        ? textarea.label
        : textarea.fieldName;
    if (key.length > 0) {
      loadedScripts[key] = textarea.script;
    }
  }

  return {
    mainScript: main.script,
    loadedScripts
  };
};

let appendScmValue = (
  sets: {
    scmClasses: Set<string>;
    urls: Set<string>;
    branches: Set<string>;
    credentialsIds: Set<string>;
  },
  key: string,
  value: unknown,
  path: string[]
) => {
  if (typeof value !== 'string' || value.length === 0) return;

  if (key === '@_class' && /scm|git|subversion|mercurial|cvs|perforce/i.test(value)) {
    sets.scmClasses.add(value);
    return;
  }

  if (/^(url|remote|repositoryUrl|repoUrl|browserUrl)$/i.test(key)) {
    sets.urls.add(value);
    return;
  }

  if (/credentialsId/i.test(key)) {
    sets.credentialsIds.add(value);
    return;
  }

  if (key === 'name' && path.some(part => /branch|branchspec/i.test(part))) {
    sets.branches.add(value);
  }
};

let walkForScm = (
  value: unknown,
  sets: {
    scmClasses: Set<string>;
    urls: Set<string>;
    branches: Set<string>;
    credentialsIds: Set<string>;
  },
  path: string[] = []
) => {
  if (Array.isArray(value)) {
    for (let item of value) walkForScm(item, sets, path);
    return;
  }

  if (!isRecord(value)) return;

  for (let [key, child] of Object.entries(value)) {
    appendScmValue(sets, key, child, path);
    walkForScm(child, sets, [...path, key]);
  }
};

export let summarizeScmFromParsedXml = (parsed: unknown): JenkinsScmSummary => {
  let sets = {
    scmClasses: new Set<string>(),
    urls: new Set<string>(),
    branches: new Set<string>(),
    credentialsIds: new Set<string>()
  };

  walkForScm(parsed, sets);

  return {
    scmClasses: uniqueStrings(sets.scmClasses),
    urls: uniqueStrings(sets.urls),
    branches: uniqueStrings(sets.branches),
    credentialsIds: uniqueStrings(sets.credentialsIds)
  };
};

let walkRecords = (value: unknown, visit: (record: JenkinsRecord) => void) => {
  if (Array.isArray(value)) {
    for (let item of value) walkRecords(item, visit);
    return;
  }

  if (!isRecord(value)) return;

  visit(value);
  for (let child of Object.values(value)) {
    walkRecords(child, visit);
  }
};

let collectStringFields = (value: unknown, fieldName: string) => {
  let values = new Set<string>();
  walkRecords(value, record => {
    let fieldValue = asString(record[fieldName]);
    if (fieldValue) values.add(fieldValue);
  });
  return uniqueStrings(values);
};

let collectGitRemoteConfigs = (value: unknown) => {
  let remotes: { uri: string; repositoryName: string }[] = [];
  walkRecords(value, record => {
    let uri = asString(record.url);
    if (!uri) return;
    remotes.push({
      uri,
      repositoryName: asString(record.name) ?? 'origin'
    });
  });
  return remotes;
};

let parseGitUriish = (value: string) => {
  let trimmed = value.trim();
  if (!trimmed) {
    throw jenkinsValidationError('scmUrl is required.');
  }

  let scpLike = trimmed.match(/^(?:(?:[^@/:]+)@)?([^/:]+):(.+)$/);
  if (scpLike && !/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return {
      host: scpLike[1],
      path: scpLike[2] ?? ''
    };
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    try {
      let parsed = new URL(trimmed);
      return {
        host: parsed.hostname || undefined,
        path: decodeURIComponent(parsed.pathname)
      };
    } catch {
      throw jenkinsValidationError('scmUrl must be a valid Git SCM URL or path.');
    }
  }

  return {
    host: undefined,
    path: trimmed
  };
};

let normalizeGitHost = (host: string | undefined) => host?.replace(/^ssh\./, '');

let normalizeGitPath = (path: string) => {
  let normalized = path.replace(/\\/g, '/');
  if (normalized.startsWith('/')) normalized = normalized.substring(1);
  if (normalized.endsWith('/')) normalized = normalized.substring(0, normalized.length - 1);
  if (normalized.endsWith('.git')) normalized = normalized.substring(0, normalized.length - 4);
  if (/^v\d\//.test(normalized)) normalized = normalized.substring(3);
  return normalized.split('/_git/').join('/');
};

export let gitScmUrlsLooselyMatch = (lhs: string, rhs: string) => {
  let lhsUri = parseGitUriish(lhs);
  let rhsUri = parseGitUriish(rhs);
  return (
    normalizeGitHost(lhsUri.host) === normalizeGitHost(rhsUri.host) &&
    normalizeGitPath(lhsUri.path) === normalizeGitPath(rhsUri.path)
  );
};

let cutGitRefs = (name: string) => {
  let match = name.match(/^refs\/[^/]+\/(.+)/);
  return match?.[1] ?? name;
};

let escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let wildcardBranchSpecToRegexSource = (branchSpec: string) => {
  let tokens = branchSpec.split(/(\*)/);
  let source = '';
  let foundWildcard = false;

  for (let token of tokens) {
    if (token.length === 0) continue;
    if (token === '*') {
      if (foundWildcard) {
        source += '.*';
        foundWildcard = false;
      } else {
        foundWildcard = true;
      }
      continue;
    }

    if (foundWildcard) {
      source += '[^/]*';
      foundWildcard = false;
    }
    source += escapeRegex(token);
  }

  if (foundWildcard) source += '[^/]*';
  return source;
};

let branchSpecMatchesRepositoryBranch = (
  branchSpec: string,
  repositoryName: string,
  branchName: string
) => {
  let expandedName = branchSpec.trim() || '**';
  let source =
    expandedName.startsWith(':') && expandedName.length > 1
      ? expandedName.substring(1)
      : wildcardBranchSpecToRegexSource(cutGitRefs(expandedName).replace(/^remotes\//, ''));
  let pattern = new RegExp(`^${source}$`);
  let branchWithoutRefs = cutGitRefs(branchName);
  return (
    pattern.test(branchWithoutRefs) || pattern.test(`${repositoryName}/${branchWithoutRefs}`)
  );
};

let gitBranchSpecsMatch = (
  branchSpecs: string[],
  repositoryName: string,
  branch: string | undefined
) => {
  let normalizedBranch = branch?.trim();
  if (!normalizedBranch) return true;

  for (let branchSpec of branchSpecs) {
    if (branchSpec.includes('$')) return true;
    if (branchSpecMatchesRepositoryBranch(branchSpec, repositoryName, normalizedBranch)) {
      return true;
    }
  }

  return false;
};

export let extractGitScmConfigsFromParsedXml = (parsed: unknown): JenkinsGitScmConfig[] => {
  let configs: JenkinsGitScmConfig[] = [];

  walkRecords(parsed, record => {
    if (asString(record['@_class']) !== 'hudson.plugins.git.GitSCM') return;

    configs.push({
      name: 'Git',
      uris: collectStringFields(record.userRemoteConfigs, 'url'),
      branches: collectStringFields(record.branches, 'name'),
      commit: null
    });
  });

  return configs;
};

let branchNamesFromRevision = (revision: JenkinsRecord) => {
  let branches = new Set<string>();
  for (let branchRecord of asArray(revision.branch).map(asRecord)) {
    let name = asString(branchRecord.name);
    if (name) branches.add(name);
  }
  return uniqueStrings(branches);
};

let commitFromRevision = (revision: JenkinsRecord) =>
  asString(revision.SHA1) ?? asString(revision.sha1) ?? null;

export let extractGitScmConfigsFromBuild = (build: JenkinsRecord): JenkinsGitScmConfig[] => {
  let configs: JenkinsGitScmConfig[] = [];

  for (let action of asArray(build.actions)) {
    let record = asRecord(action);
    let actionClass = jobClassFromRecord(record);
    if (actionClass !== 'hudson.plugins.git.util.BuildData') continue;

    let revision = asRecord(record.lastBuiltRevision);
    configs.push({
      name: 'Git',
      uris: asArray(record.remoteUrls)
        .map(remoteUrl => asString(remoteUrl))
        .filter((value): value is string => Boolean(value)),
      branches: branchNamesFromRevision(revision),
      commit: commitFromRevision(revision)
    });
  }

  return configs;
};

export let extractGitScmMatchTargetsFromParsedXml = (
  parsed: unknown
): JenkinsGitScmMatchTarget[] => {
  let targets: JenkinsGitScmMatchTarget[] = [];

  walkRecords(parsed, record => {
    if (asString(record['@_class']) !== 'hudson.plugins.git.GitSCM') return;

    let branchSpecs = collectStringFields(record.branches, 'name');
    if (branchSpecs.length === 0) branchSpecs = ['*/master'];
    for (let remote of collectGitRemoteConfigs(record.userRemoteConfigs)) {
      targets.push({
        uri: remote.uri,
        repositoryName: remote.repositoryName,
        branchSpecs
      });
    }
  });

  return targets;
};

export let gitScmMatchTargetMatches = (
  target: JenkinsGitScmMatchTarget,
  scmUrl: string,
  branch: string | undefined
) =>
  gitScmUrlsLooselyMatch(scmUrl, target.uri) &&
  gitBranchSpecsMatch(target.branchSpecs, target.repositoryName, branch);

export let summarizeScmFromBuild = (
  build: JenkinsRecord
): JenkinsScmSummary & {
  revisions: string[];
} => {
  let urls = new Set<string>();
  let branches = new Set<string>();
  let scmClasses = new Set<string>();
  let credentialsIds = new Set<string>();
  let revisions = new Set<string>();

  for (let action of asArray(build.actions)) {
    let record = asRecord(action);
    let actionClass = jobClassFromRecord(record);
    if (actionClass && /scm|git|subversion|mercurial|cvs|perforce/i.test(actionClass)) {
      scmClasses.add(actionClass);
    }

    for (let remoteUrl of asArray(record.remoteUrls)) {
      let value = asString(remoteUrl);
      if (value) urls.add(value);
    }

    let revision = asRecord(record.lastBuiltRevision);
    let sha = commitFromRevision(revision);
    if (sha) revisions.add(sha);

    for (let name of branchNamesFromRevision(revision)) {
      branches.add(name);
    }
    for (let branchRecord of asArray(revision.branch).map(asRecord)) {
      let branchSha = asString(branchRecord.SHA1) ?? asString(branchRecord.sha1);
      if (branchSha) revisions.add(branchSha);
    }

    let buildsByBranchName = asRecord(record.buildsByBranchName);
    for (let [branchName, branchRecordValue] of Object.entries(buildsByBranchName)) {
      if (branchName) branches.add(branchName);
      let branchRecord = asRecord(branchRecordValue);
      let branchRevision = asRecord(branchRecord.revision);
      let branchSha = asString(branchRevision.SHA1) ?? asString(branchRevision.sha1);
      if (branchSha) revisions.add(branchSha);
    }

    for (let credential of asArray(record.credentialsIds)) {
      let value = asString(credential);
      if (value) credentialsIds.add(value);
    }
  }

  return {
    scmClasses: uniqueStrings(scmClasses),
    urls: uniqueStrings(urls),
    branches: uniqueStrings(branches),
    credentialsIds: uniqueStrings(credentialsIds),
    revisions: uniqueStrings(revisions)
  };
};

let changesetTree =
  'kind,items[commitId,id,msg,comment,timestamp,author[fullName,name,id],authorEmail,affectedPaths,paths[file,path,editType]]';

let buildChangesetTree = `number,url,changeSet[${changesetTree}],changeSets[${changesetTree}]`;

let affectedPathsFromChangeItem = (item: JenkinsRecord) => {
  let paths = asArray(item.affectedPaths)
    .map(value => asString(value))
    .filter((value): value is string => Boolean(value));

  if (paths.length > 0) return paths;

  return asArray(item.paths)
    .map(value => {
      let record = asRecord(value);
      return asString(record.file) ?? asString(record.path);
    })
    .filter((value): value is string => Boolean(value));
};

let changeSetRecordsFromBuild = (build: JenkinsRecord) => {
  let changeSets = asArray(build.changeSets)
    .map(asRecord)
    .filter(record => Object.keys(record).length > 0);
  let singularChangeSet = asRecord(build.changeSet);
  if (changeSets.length === 0 && Object.keys(singularChangeSet).length > 0) {
    changeSets.push(singularChangeSet);
  }
  return changeSets;
};

export let summarizeBuildChangesets = (build: JenkinsRecord, includeRaw = false) => {
  let changeSets: JenkinsBuildChangeSet[] = [];
  let changes: JenkinsBuildChange[] = [];

  for (let changeSetRecord of changeSetRecordsFromBuild(build)) {
    let items: JenkinsBuildChange[] = [];
    for (let item of asArray(changeSetRecord.items)) {
      let itemRecord = asRecord(item);
      let author = asRecord(itemRecord.author);
      let change = {
        commitId: asString(itemRecord.commitId) ?? asString(itemRecord.id),
        message: asString(itemRecord.msg) ?? asString(itemRecord.comment),
        timestamp: asNumber(itemRecord.timestamp),
        authorName: asString(author.fullName) ?? asString(author.name) ?? asString(author.id),
        authorEmail: asString(itemRecord.authorEmail),
        affectedPaths: affectedPathsFromChangeItem(itemRecord),
        ...(includeRaw ? { raw: itemRecord } : {})
      };
      items.push(change);
      changes.push(change);
    }

    changeSets.push({
      kind: asString(changeSetRecord.kind),
      itemCount: items.length,
      items,
      ...(includeRaw ? { raw: changeSetRecord } : {})
    });
  }

  return {
    changeSets,
    changes
  };
};

export class JenkinsClient {
  private axios: ReturnType<typeof createAxios>;
  readonly baseUrl: string;

  constructor(params: { auth: JenkinsAuth }) {
    let auth = normalizeJenkinsAuth(params.auth);
    this.baseUrl = auth.baseUrl;
    let credentials = Buffer.from(`${auth.username}:${auth.apiToken}`, 'utf8').toString(
      'base64'
    );

    this.axios = createAxios({
      baseURL: this.baseUrl,
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${credentials}`
      },
      paramsSerializer: { serialize: serializeParams }
    });
  }

  private jobPath(fullName: string) {
    return encodeJobPath(fullName);
  }

  private folderPath(fullName: string | undefined) {
    return fullName ? this.jobPath(fullName) : '';
  }

  private async requestData<T>(operation: string, run: () => Promise<{ data: T }>) {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw jenkinsApiError(error, operation);
    }
  }

  private async requestResponse<T>(
    operation: string,
    run: () => Promise<{ data: T; headers?: unknown; status?: number }>
  ) {
    try {
      return await run();
    } catch (error) {
      throw jenkinsApiError(error, operation);
    }
  }

  private async rawPost<T>(
    operation: string,
    path: string,
    data?: unknown,
    config?: {
      headers?: Record<string, string>;
      params?: Record<string, unknown>;
      maxRedirects?: number;
      validateStatus?: (status: number) => boolean;
    }
  ) {
    try {
      return await this.axios.post<T>(path, data, config);
    } catch (error) {
      if (!shouldRetryWithCrumb(error)) {
        throw jenkinsApiError(error, operation);
      }

      let crumb = await this.getCrumb();
      if (!crumb) {
        throw jenkinsApiError(error, operation);
      }

      try {
        return await this.axios.post<T>(path, data, {
          ...config,
          headers: {
            ...(config?.headers ?? {}),
            [crumb.crumbField]: crumb.crumb
          }
        });
      } catch (retryError) {
        throw jenkinsApiError(retryError, operation);
      }
    }
  }

  async getCrumb() {
    try {
      let response = await this.axios.get<{
        crumbRequestField?: string;
        crumb?: string;
      }>('/crumbIssuer/api/json');

      let crumbField = response.data.crumbRequestField;
      let crumb = response.data.crumb;
      if (!crumbField || !crumb) return undefined;
      return { crumbField, crumb };
    } catch {
      return undefined;
    }
  }

  async getMe() {
    return this.requestData<JenkinsRecord>('get current user', () =>
      this.axios.get('/me/api/json')
    );
  }

  async getRoot() {
    let response = await this.requestResponse<JenkinsRecord>('get controller status', () =>
      this.axios.get('/api/json')
    );
    return {
      data: response.data,
      version: getResponseHeaderValue(response.headers, 'x-jenkins')
    };
  }

  async getQueue() {
    return this.requestData<JenkinsRecord>('get queue', () =>
      this.axios.get('/queue/api/json')
    );
  }

  async getComputers() {
    return this.requestData<JenkinsRecord>('get computers', () =>
      this.axios.get('/computer/api/json')
    );
  }

  async getStatus() {
    let [root, queue, computers] = await Promise.all([
      this.getRoot(),
      this.getQueue(),
      this.getComputers()
    ]);

    return {
      root,
      queue,
      computers
    };
  }

  async listJobs(
    options: {
      folderFullName?: string;
      recursive?: boolean;
      maxDepth?: number;
      nameContains?: string;
      includeFolders?: boolean;
    } = {}
  ) {
    let maxDepth = normalizeLimit(options.maxDepth, options.recursive ? 5 : 1, 20, 'maxDepth');
    let jobs: JenkinsJobSummary[] = [];

    let visit = async (folderFullName: string | undefined, depth: number) => {
      let data = await this.requestData<JenkinsRecord>('list jobs', () =>
        this.axios.get(`${this.folderPath(folderFullName)}/api/json`, {
          params: {
            tree: 'jobs[name,fullName,url,color,buildable,_class,jobs[name,fullName,url,color,buildable,_class]]'
          }
        })
      );

      let childJobs = asArray(data.jobs)
        .map(rawJob => {
          let record = asRecord(rawJob);
          return mapJobSummary(record);
        })
        .sort(compareJobSummariesByName);

      for (let summary of childJobs) {
        let fullName = summary.fullName;
        if (!summary.isFolder || options.includeFolders) {
          jobs.push(summary);
        }
        if (options.recursive && summary.isFolder && fullName && depth < maxDepth) {
          await visit(fullName, depth + 1);
        }
      }
    };

    await visit(options.folderFullName, 1);

    let nameFilter = options.nameContains?.trim().toLowerCase();
    if (nameFilter) {
      jobs = jobs.filter(job =>
        [job.name, job.fullName].some(value => value?.toLowerCase().includes(nameFilter))
      );
    }

    return jobs;
  }

  async getJob(jobFullName: string) {
    return this.requestData<JenkinsRecord>('get job', () =>
      this.axios.get(`${this.jobPath(jobFullName)}/api/json`, {
        params: {
          tree: 'name,fullName,displayName,fullDisplayName,url,description,color,buildable,inQueue,keepDependencies,nextBuildNumber,_class,healthReport[description,iconClassName,score],lastBuild[number,url,result,timestamp,duration,building],lastCompletedBuild[number,url,result,timestamp,duration,building],lastSuccessfulBuild[number,url,result,timestamp,duration,building],lastFailedBuild[number,url,result,timestamp,duration,building],builds[number,url,result,timestamp,duration,building,displayName]{0,20}'
        }
      })
    );
  }

  async triggerBuild(jobFullName: string, parameters?: JenkinsBuildParameters) {
    let body = serializeBuildParameters(parameters);
    let hasParameters = parameters && Object.keys(parameters).length > 0;
    let path = `${this.jobPath(jobFullName)}/${hasParameters ? 'buildWithParameters' : 'build'}`;
    let headers: Record<string, string> = {};

    if (hasParameters) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    let response = await this.rawPost<void>('trigger build', path, body, { headers });
    let queueUrl = getResponseHeaderValue(response.headers, 'location');
    return {
      queueUrl,
      queueId: parseQueueIdFromLocation(queueUrl)
    };
  }

  async getQueueItem(queueId: number) {
    return this.requestData<JenkinsRecord>('get queue item', () =>
      this.axios.get(`/queue/item/${queueId}/api/json`)
    );
  }

  async getBuild(
    jobFullName: string,
    buildSelector: JenkinsBuildSelector | undefined,
    buildNumber: number | undefined,
    tree?: string
  ) {
    let buildPath = parseBuildSelectorPath(buildSelector, buildNumber);
    return this.requestData<JenkinsRecord>('get build', () =>
      this.axios.get(`${this.jobPath(jobFullName)}/${buildPath}/api/json`, {
        params: { tree }
      })
    );
  }

  private async resolveBuildNumber(jobFullName: string, buildNumber: number | undefined) {
    let build = await this.getBuild(
      jobFullName,
      buildNumber === undefined ? 'lastBuild' : 'number',
      buildNumber,
      'number'
    );
    let resolvedBuildNumber = asNumber(build.number);
    if (!resolvedBuildNumber) {
      throw jenkinsValidationError('Jenkins build did not include a numeric build number.');
    }
    return resolvedBuildNumber;
  }

  async updateBuildDescription(jobFullName: string, buildNumber: number, description: string) {
    let params = new URLSearchParams({ description });
    await this.rawPost<void>(
      'update build description',
      `${this.jobPath(jobFullName)}/${buildNumber}/submitDescription`,
      params.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
  }

  async updateBuildMetadata(
    jobFullName: string,
    buildNumber: number | undefined,
    update: {
      displayName?: string;
      description?: string;
    }
  ) {
    let build = await this.getBuild(
      jobFullName,
      buildNumber === undefined ? 'lastBuild' : 'number',
      buildNumber,
      'number,displayName,description'
    );
    let resolvedBuildNumber = asNumber(build.number);
    if (!resolvedBuildNumber) {
      throw jenkinsValidationError('Jenkins build did not include a numeric build number.');
    }

    let updateDisplayName = update.displayName !== undefined && update.displayName.length > 0;
    let updateDescription = update.description !== undefined && update.description.length > 0;

    if (!updateDisplayName && !updateDescription) {
      return {
        buildNumber: resolvedBuildNumber,
        updated: false,
        updatedDescription: false,
        updatedDisplayName: false
      };
    }

    if (updateDisplayName) {
      let displayName = update.displayName ?? '';
      let description = updateDescription
        ? (update.description ?? '')
        : build.description === null
          ? ''
          : (asString(build.description) ?? '');
      let json = JSON.stringify({ displayName, description });
      let params = new URLSearchParams({
        displayName,
        description,
        json
      });

      await this.rawPost<void>(
        'update build metadata',
        `${this.jobPath(jobFullName)}/${resolvedBuildNumber}/configSubmit`,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
    } else if (updateDescription) {
      await this.updateBuildDescription(
        jobFullName,
        resolvedBuildNumber,
        update.description ?? ''
      );
    }

    return {
      buildNumber: resolvedBuildNumber,
      updated: updateDisplayName || updateDescription,
      updatedDescription: updateDescription,
      updatedDisplayName: updateDisplayName
    };
  }

  async getBuildLog(params: {
    jobFullName: string;
    buildNumber?: number;
    skip?: number;
    limit?: number;
    cursor?: string;
    maxLines: number;
  }): Promise<JenkinsBuildLogPage> {
    let buildNumber = await this.resolveBuildNumber(params.jobFullName, params.buildNumber);
    let skip = params.skip ?? 0;
    if (!Number.isFinite(skip)) {
      throw jenkinsValidationError('skip must be a finite number.');
    }

    let requestedLimit = params.limit === undefined || params.limit === 0 ? 100 : params.limit;
    if (!Number.isFinite(requestedLimit)) {
      throw jenkinsValidationError('limit must be a finite number.');
    }

    let absLimit = Math.min(Math.abs(Math.trunc(requestedLimit)), params.maxLines);
    let limit = requestedLimit < 0 ? -absLimit : absLimit;
    let cursor = params.cursor?.trim();

    if (cursor) {
      let byteOffset = decodeBuildLogCursor(cursor, buildNumber);
      return this.readForwardBuildLog({
        jobFullName: params.jobFullName,
        buildNumber,
        startByte: byteOffset,
        skip: 0,
        limit: absLimit,
        knowLineNumbers: false,
        baseLine: 0
      });
    }

    let resolvedSkip = Math.trunc(skip);
    if ((resolvedSkip >= 0 && limit > 0) || (resolvedSkip > 0 && limit < 0)) {
      let forwardSkip = resolvedSkip;
      let forwardLimit = absLimit;
      if (limit < 0) {
        forwardSkip = Math.max(0, resolvedSkip - forwardLimit);
      }
      return this.readForwardBuildLog({
        jobFullName: params.jobFullName,
        buildNumber,
        startByte: 0,
        skip: forwardSkip,
        limit: forwardLimit,
        knowLineNumbers: true,
        baseLine: forwardSkip
      });
    }

    return this.readTailBuildLog({
      jobFullName: params.jobFullName,
      buildNumber,
      skip: resolvedSkip,
      limit
    });
  }

  private async readForwardBuildLog(params: {
    jobFullName: string;
    buildNumber: number;
    startByte: number;
    skip: number;
    limit: number;
    knowLineNumbers: boolean;
    baseLine: number;
  }): Promise<JenkinsBuildLogPage> {
    let chunk = await this.getProgressiveLog(
      params.jobFullName,
      params.buildNumber,
      params.startByte
    );
    let entries = splitLogLines(chunk.text);
    let lines: string[] = [];
    let bytesConsumed = 0;
    let skipped = 0;
    let captureEndOffset = -1;
    let hasMoreContent = false;

    for (let entry of entries) {
      if (skipped < params.skip) {
        skipped += 1;
        bytesConsumed += entry.byteLength;
        continue;
      }

      if (lines.length < params.limit) {
        lines.push(entry.text);
        bytesConsumed += entry.byteLength;
        captureEndOffset = bytesConsumed;
        continue;
      }

      hasMoreContent = true;
      break;
    }

    let endOffset = params.startByte + bytesConsumed;
    let nextOffset = hasMoreContent
      ? params.startByte + captureEndOffset
      : chunk.moreData
        ? (chunk.nextStart ?? endOffset)
        : undefined;

    return {
      buildNumber: params.buildNumber,
      lines,
      hasMoreContent,
      startLine: !params.knowLineNumbers || lines.length === 0 ? -1 : params.baseLine + 1,
      endLine:
        !params.knowLineNumbers || lines.length === 0 ? -1 : params.baseLine + lines.length,
      totalLines: -1,
      nextCursor:
        nextOffset !== undefined
          ? encodeBuildLogCursor(params.buildNumber, nextOffset)
          : undefined
    };
  }

  private async readTailBuildLog(params: {
    jobFullName: string;
    buildNumber: number;
    skip: number;
    limit: number;
  }): Promise<JenkinsBuildLogPage> {
    let chunk = await this.getProgressiveLog(params.jobFullName, params.buildNumber, 0);
    let entries = splitLogLines(chunk.text);
    let totalLines = entries.length;
    let resolvedLimit = Math.abs(params.limit);
    let resolvedSkip: number;

    if (params.skip === 0) {
      resolvedSkip = Math.max(0, totalLines - resolvedLimit);
    } else if (params.limit > 0) {
      resolvedSkip = Math.max(0, totalLines + params.skip);
    } else {
      resolvedSkip = Math.max(0, totalLines + params.skip - resolvedLimit);
    }

    let endExclusive = Math.min(resolvedSkip + resolvedLimit, totalLines);
    let offsets: number[] = [];
    let offset = 0;
    for (let entry of entries) {
      offset += entry.byteLength;
      offsets.push(offset);
    }

    let lines = entries.slice(resolvedSkip, endExclusive).map(entry => entry.text);
    let hasMoreContent = endExclusive < totalLines;
    let nextOffset = hasMoreContent
      ? offsets[endExclusive - 1]
      : chunk.moreData
        ? (chunk.nextStart ?? offset)
        : undefined;

    return {
      buildNumber: params.buildNumber,
      lines,
      hasMoreContent,
      startLine: lines.length === 0 ? -1 : resolvedSkip + 1,
      endLine: lines.length === 0 ? -1 : endExclusive,
      totalLines,
      nextCursor:
        nextOffset !== undefined
          ? encodeBuildLogCursor(params.buildNumber, nextOffset)
          : undefined
    };
  }

  async getProgressiveLog(
    jobFullName: string,
    buildNumber: number,
    start = 0
  ): Promise<JenkinsLogChunk> {
    let path = `${this.jobPath(jobFullName)}/${buildNumber}/logText/progressiveText`;

    try {
      let response = await this.axios.get<string>(path, {
        params: { start },
        responseType: 'text'
      });
      let nextStart = maybeNumberFromHeader(
        getResponseHeaderValue(response.headers, 'x-text-size')
      );
      return {
        text: typeof response.data === 'string' ? response.data : String(response.data ?? ''),
        start,
        nextStart,
        moreData: getResponseHeaderValue(response.headers, 'x-more-data') === 'true',
        progressive: true
      };
    } catch (error) {
      if (isMissingOrUnsupported(error)) {
        let text = await this.getConsoleText(jobFullName, buildNumber);
        let buffer = Buffer.from(text, 'utf8');
        let boundedStart = Math.min(start, buffer.length);
        return {
          text: buffer.subarray(boundedStart).toString('utf8'),
          start,
          nextStart: buffer.length,
          moreData: false,
          progressive: false
        };
      }
      throw jenkinsApiError(error, 'get build log');
    }
  }

  async getConsoleText(jobFullName: string, buildNumber: number) {
    return this.requestData<string>('get console text', () =>
      this.axios.get(`${this.jobPath(jobFullName)}/${buildNumber}/consoleText`, {
        responseType: 'text'
      })
    );
  }

  async readLogUntil(params: {
    jobFullName: string;
    buildNumber: number;
    start?: number;
    maxLines: number;
  }) {
    let start = params.start ?? 0;
    let nextStart: number | undefined = start;
    let moreData = false;
    let progressive = true;
    let text = '';
    let chunks = 0;

    while (chunks < 50) {
      let chunk = await this.getProgressiveLog(params.jobFullName, params.buildNumber, start);
      text += chunk.text;
      moreData = chunk.moreData;
      progressive = chunk.progressive;
      nextStart = chunk.nextStart;
      chunks += 1;

      let boundedText = truncateLogTextToMaxLines(text, params.maxLines);
      if (boundedText.truncated) {
        text = boundedText.text;
        nextStart = (params.start ?? 0) + boundedText.byteLength;
        moreData = true;
        break;
      }

      let lines = splitLogLines(text);
      if (
        !moreData ||
        !chunk.nextStart ||
        chunk.nextStart <= start ||
        lines.length >= params.maxLines
      ) {
        break;
      }
      start = chunk.nextStart;
    }

    return {
      text,
      start: params.start ?? 0,
      nextStart,
      moreData,
      progressive
    };
  }

  private async getQueueItemIfAvailable(queueId: number | undefined) {
    if (!queueId) return undefined;

    try {
      return await this.getQueueItem(queueId);
    } catch (error) {
      if (getJenkinsErrorStatus(error) === 404) return undefined;
      throw error;
    }
  }

  private async getQueueItemForJobIfAvailable(jobFullName: string) {
    try {
      let queue = await this.getQueue();
      return asArray(queue.items)
        .map(asRecord)
        .find(item => {
          let task = asRecord(item.task);
          return asString(task.fullName) === jobFullName;
        });
    } catch (error) {
      if (getJenkinsErrorStatus(error) === 404) return undefined;
      throw error;
    }
  }

  private async getReplayPageIfAvailable(jobFullName: string, buildNumber: number) {
    try {
      let response = await this.axios.get<string>(
        `${this.jobPath(jobFullName)}/${buildNumber}/replay`,
        {
          responseType: 'text',
          headers: { Accept: 'text/html' }
        }
      );
      return typeof response.data === 'string' ? response.data : String(response.data ?? '');
    } catch (error) {
      let status = getJenkinsErrorStatus(error);
      if (status === 403 || isMissingOrUnsupported(error)) return undefined;
      throw jenkinsApiError(error, 'get replay scripts');
    }
  }

  private async replayOriginalBuild(jobFullName: string, buildNumber: number) {
    let html = await this.getReplayPageIfAvailable(jobFullName, buildNumber);
    if (!html) return undefined;
    if (!hasReplayRebuildForm(html) && !extractReplayScriptsFromHtml(html)) return undefined;

    try {
      let response = await this.rawPost<void>(
        'rebuild build with replay',
        `${this.jobPath(jobFullName)}/${buildNumber}/replay/rebuild`,
        undefined,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      let queueUrl = getResponseHeaderValue(response.headers, 'location');
      let queueId = parseQueueIdFromLocation(queueUrl);
      let queueItem =
        (await this.getQueueItemIfAvailable(queueId)) ??
        (await this.getQueueItemForJobIfAvailable(jobFullName));
      return {
        queueUrl: queueUrl ?? asString(queueItem?.url),
        queueId: queueId ?? asNumber(queueItem?.id),
        queueItem
      };
    } catch (error) {
      let status = getJenkinsErrorStatus(error);
      if (status === 403 || isMissingOrUnsupported(error)) return undefined;
      throw error;
    }
  }

  async rebuildBuild(jobFullName: string, buildNumber: number | undefined) {
    let build = await this.getBuild(
      jobFullName,
      buildNumber === undefined ? 'lastBuild' : 'number',
      buildNumber,
      'number,actions[parameters[name,value]]'
    );
    let sourceBuildNumber = asNumber(build.number);
    if (!sourceBuildNumber) {
      throw jenkinsValidationError('Jenkins build did not include a numeric build number.');
    }

    let replayResult = await this.replayOriginalBuild(jobFullName, sourceBuildNumber);
    if (replayResult) {
      return {
        sourceBuildNumber,
        ...replayResult
      };
    }

    let parameters = buildParameterValues(build);
    let triggerResult = await this.triggerBuild(
      jobFullName,
      Object.keys(parameters).length > 0 ? parameters : undefined
    );
    return {
      sourceBuildNumber,
      ...triggerResult,
      queueItem: await this.getQueueItemIfAvailable(triggerResult.queueId)
    };
  }

  async getReplayScripts(
    jobFullName: string,
    buildNumber: number | undefined
  ): Promise<JenkinsReplayScripts> {
    let resolvedBuildNumber = await this.resolveBuildNumber(jobFullName, buildNumber);
    let html: string;
    try {
      let response = await this.axios.get<string>(
        `${this.jobPath(jobFullName)}/${resolvedBuildNumber}/replay`,
        {
          responseType: 'text',
          headers: { Accept: 'text/html' }
        }
      );
      html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
    } catch (error) {
      if (isMissingOrUnsupported(error)) {
        throw jenkinsValidationError(
          'Pipeline Replay is not available for this build through Jenkins REST/HTTP endpoints. Install or enable Pipeline Replay for this job, then retry.'
        );
      }
      throw jenkinsApiError(error, 'get replay scripts');
    }

    let scripts = extractReplayScriptsFromHtml(html);
    if (scripts) {
      return {
        buildNumber: resolvedBuildNumber,
        ...scripts
      };
    }

    if (hasReplayRebuildForm(html)) {
      throw jenkinsValidationError(
        'Pipeline Replay rebuild is available for this build, but Jenkins did not expose editable replay scripts in the response.'
      );
    }

    throw jenkinsValidationError(
      'Pipeline Replay page was reachable, but no replay scripts were exposed in the response.'
    );
  }

  async replayBuild(
    jobFullName: string,
    buildNumber: number | undefined,
    mainScript: string,
    loadedScripts?: Record<string, string>
  ): Promise<JenkinsReplayBuildResult> {
    let sourceBuildNumber = await this.resolveBuildNumber(jobFullName, buildNumber);
    let params = serializeReplayForm(mainScript, loadedScripts);
    let path = `${this.jobPath(jobFullName)}/${sourceBuildNumber}/replay/run`;
    try {
      let response = await this.rawPost<void>('replay build', path, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      });
      let location = getResponseHeaderValue(response.headers, 'location');
      let queueId = parseQueueIdFromLocation(location);
      let queueUrl = queueId ? location : undefined;
      let redirectUrl = queueId ? undefined : resolveLocationUrl(this.baseUrl, path, location);
      return {
        sourceBuildNumber,
        queueUrl,
        queueId,
        redirectUrl,
        location,
        queueItem: await this.getQueueItemIfAvailable(queueId)
      };
    } catch (error) {
      if (isMissingOrUnsupported(error)) {
        throw jenkinsValidationError(
          'Pipeline Replay run endpoint is not available for this build. Jenkins did not expose a supported REST/HTTP replay endpoint.'
        );
      }
      throw error;
    }
  }

  async getTestReportForBuild(jobFullName: string, buildNumber: number | undefined) {
    let resolvedBuildNumber =
      buildNumber ?? (await this.resolveBuildNumber(jobFullName, undefined));
    let report = await this.requestData<JenkinsRecord>('get test report', () =>
      this.axios.get(`${this.jobPath(jobFullName)}/${resolvedBuildNumber}/testReport/api/json`)
    );
    return {
      buildNumber: resolvedBuildNumber,
      report
    };
  }

  async getTestReport(jobFullName: string, buildNumber: number) {
    let { report } = await this.getTestReportForBuild(jobFullName, buildNumber);
    return report;
  }

  async getConfigXml(jobFullName: string) {
    return this.requestData<string>('get job config XML', () =>
      this.axios.get(`${this.jobPath(jobFullName)}/config.xml`, {
        responseType: 'text',
        headers: { Accept: 'application/xml,text/xml,text/plain' }
      })
    );
  }

  async getJobScm(jobFullName: string) {
    let xml = await this.getConfigXml(jobFullName);
    let parsed: unknown;
    try {
      parsed = xmlParser.parse(xml);
    } catch {
      throw jenkinsValidationError(
        'Jenkins returned job config XML that could not be parsed.'
      );
    }
    return {
      summary: summarizeScmFromParsedXml(parsed),
      gitScms: extractGitScmConfigsFromParsedXml(parsed),
      gitScmMatchTargets: extractGitScmMatchTargetsFromParsedXml(parsed),
      parsedConfig: asRecord(parsed)
    };
  }

  async getBuildScm(jobFullName: string, buildNumber: number | undefined) {
    let build = await this.getBuild(
      jobFullName,
      buildNumber === undefined ? 'lastBuild' : 'number',
      buildNumber,
      'number,actions[_class,remoteUrls,lastBuiltRevision[SHA1,branch[name,SHA1]],buildsByBranchName]'
    );
    return {
      build,
      summary: summarizeScmFromBuild(build),
      gitScms: extractGitScmConfigsFromBuild(build)
    };
  }

  async getBuildChangesets(
    jobFullName: string,
    buildNumber: number | undefined,
    includeRaw = false
  ) {
    let build = await this.getBuild(
      jobFullName,
      buildNumber === undefined ? 'lastBuild' : 'number',
      buildNumber,
      buildChangesetTree
    );
    let resolvedBuildNumber = asNumber(build.number);
    if (!resolvedBuildNumber) {
      throw jenkinsValidationError('Jenkins build did not include a numeric build number.');
    }
    let changesets = summarizeBuildChangesets(build, includeRaw);
    return {
      build,
      buildNumber: resolvedBuildNumber,
      ...changesets
    };
  }
}

export let createJenkinsClient = (params: { auth: JenkinsAuth }) => new JenkinsClient(params);
