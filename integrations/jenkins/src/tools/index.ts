import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  asArray,
  asBoolean,
  asNumber,
  asRecord,
  asString,
  createJenkinsClient,
  folderFullNameFromInput,
  gitScmMatchTargetMatches,
  isFolderJobRecord,
  type JenkinsBuildSelector,
  type JenkinsRecord,
  jenkinsValidationError,
  jobFullNameFromInput,
  normalizeLimit,
  normalizeSkip,
  resolveMaxLogLines
} from '../lib/client';
import { spec } from '../spec';

let rawRecordSchema = z
  .record(z.string(), z.any())
  .describe('Raw Jenkins response fields for advanced use.');

let buildSelectorSchema = z
  .enum([
    'number',
    'lastBuild',
    'lastCompletedBuild',
    'lastSuccessfulBuild',
    'lastFailedBuild'
  ])
  .optional()
  .describe(
    'Build selector. Use number with buildNumber, or one of Jenkins last-build selectors. When omitted, buildNumber selects a specific build and missing buildNumber selects lastBuild.'
  );

let includeRawInput = {
  includeRaw: z
    .boolean()
    .optional()
    .describe('Include the raw Jenkins response object for advanced troubleshooting.')
};

let jobFullNameInput = {
  jobFullName: z
    .string()
    .optional()
    .describe(
      'Jenkins job full name, using slash-separated folder and job names. Defaults to config.defaultJobFullName.'
    )
};

let folderFullNameInput = {
  folderFullName: z
    .string()
    .optional()
    .describe(
      'Jenkins folder full name, using slash-separated folder names. Defaults to config.defaultFolderFullName.'
    )
};

let buildParameterScalarSchema = z.union([z.string(), z.number(), z.boolean()]);
let buildParameterValueSchema = z.union([
  buildParameterScalarSchema,
  z.array(buildParameterScalarSchema)
]);

let recentBuildSchema = z.object({
  number: z.number().optional().describe('Build number.'),
  url: z.string().optional().describe('Build URL.'),
  result: z
    .string()
    .optional()
    .nullable()
    .describe('Build result, such as SUCCESS or FAILURE.'),
  building: z.boolean().optional().describe('Whether this build is still running.'),
  timestamp: z.number().optional().describe('Build start timestamp in milliseconds.'),
  duration: z.number().optional().describe('Build duration in milliseconds.'),
  displayName: z.string().optional().describe('Build display name.')
});

let jobSummarySchema = z.object({
  name: z.string().optional().describe('Jenkins job name.'),
  fullName: z.string().optional().describe('Jenkins full job name.'),
  url: z.string().optional().describe('Jenkins job URL.'),
  color: z.string().optional().describe('Jenkins job status color.'),
  status: z.string().optional().describe('Normalized status derived from the Jenkins color.'),
  buildable: z.boolean().optional().describe('Whether Jenkins reports the job as buildable.'),
  jobClass: z.string().optional().describe('Jenkins implementation class for the item.'),
  isFolder: z.boolean().describe('Whether this item appears to be a Jenkins folder.'),
  raw: rawRecordSchema.optional()
});

let buildSchema = z.object({
  number: z.number().optional().describe('Build number.'),
  id: z.string().optional().describe('Build id returned by Jenkins.'),
  jobFullName: z.string().describe('Jenkins job full name used for the lookup.'),
  url: z.string().optional().describe('Build URL.'),
  displayName: z.string().optional().describe('Build display name.'),
  fullDisplayName: z.string().optional().describe('Jenkins full build display name.'),
  description: z.string().optional().nullable().describe('Build description.'),
  result: z.string().optional().nullable().describe('Build result.'),
  status: z.string().optional().describe('Normalized build status.'),
  building: z.boolean().optional().describe('Whether this build is still running.'),
  timestamp: z.number().optional().describe('Build start timestamp in milliseconds.'),
  duration: z.number().optional().describe('Build duration in milliseconds.'),
  estimatedDuration: z
    .number()
    .optional()
    .describe('Estimated build duration in milliseconds.'),
  queueId: z
    .number()
    .optional()
    .describe('Queue id that scheduled the build, when available.'),
  keepLog: z
    .boolean()
    .optional()
    .describe('Whether Jenkins is configured to keep this build log.'),
  raw: rawRecordSchema.optional()
});

let queueTaskSchema = z.object({
  name: z.string().optional().describe('Queued task name.'),
  fullName: z.string().optional().describe('Queued task full name.'),
  url: z.string().optional().describe('Queued task URL.'),
  color: z.string().optional().describe('Queued task status color.')
});

let queueItemSchema = z.object({
  id: z.number().optional().describe('Queue item id.'),
  queueClass: z.string().optional().describe('Jenkins queue item implementation class.'),
  url: z.string().optional().describe('Queue item URL.'),
  blocked: z.boolean().optional().describe('Whether the item is blocked.'),
  buildable: z.boolean().optional().describe('Whether the item can run.'),
  pending: z.boolean().optional().describe('Whether the buildable queue item is pending.'),
  stuck: z.boolean().optional().describe('Whether Jenkins considers the queue item stuck.'),
  cancelled: z.boolean().optional().describe('Whether the queue item was cancelled.'),
  why: z.string().optional().nullable().describe('Jenkins queue reason.'),
  params: z
    .string()
    .optional()
    .describe('Human-readable parameters for the queued item, when Jenkins exposes them.'),
  inQueueSince: z
    .number()
    .optional()
    .describe('Unix timestamp in milliseconds for when Jenkins queued the item.'),
  buildableStartMilliseconds: z
    .number()
    .optional()
    .describe('Unix timestamp in milliseconds for when the item became buildable.'),
  timestamp: z
    .number()
    .optional()
    .describe('Waiting-item timestamp in milliseconds, when Jenkins serializes one.'),
  task: queueTaskSchema.optional().describe('Queued Jenkins task.'),
  executable: z
    .object({
      number: z.number().optional().describe('Started build number.'),
      url: z.string().optional().describe('Started build URL.')
    })
    .optional()
});

let scmSummarySchema = z.object({
  scmClasses: z.array(z.string()).describe('SCM implementation classes detected by Jenkins.'),
  urls: z.array(z.string()).describe('SCM repository URLs detected from Jenkins data.'),
  branches: z.array(z.string()).describe('SCM branch names or patterns detected.'),
  credentialsIds: z
    .array(z.string())
    .describe('Jenkins credentials ids referenced by SCM config, when visible.')
});

let gitScmConfigSchema = z.object({
  name: z.literal('Git').describe('SCM type name, matching the Jenkins MCP plugin.'),
  uris: z.array(z.string()).describe('Git repository URIs configured on the job.'),
  branches: z.array(z.string()).describe('Git branch specs or built branches.'),
  commit: z
    .string()
    .nullable()
    .describe(
      'Git commit revision. Null for job-level SCM config or when Jenkins has no build revision.'
    )
});

let buildChangeSchema = z.object({
  commitId: z.string().optional().describe('SCM commit or revision id.'),
  message: z.string().optional().describe('Commit message or SCM change comment.'),
  timestamp: z.number().optional().describe('Commit timestamp in milliseconds.'),
  authorName: z.string().optional().describe('Change author display name.'),
  authorEmail: z.string().optional().describe('Change author email, when Jenkins exposes it.'),
  affectedPaths: z.array(z.string()).describe('Workspace paths affected by this change.'),
  raw: rawRecordSchema.optional()
});

let buildChangeSetSchema = z.object({
  kind: z.string().optional().describe('Jenkins change log set kind, such as git.'),
  itemCount: z.number().describe('Number of changes in this Jenkins change log set.'),
  items: z.array(buildChangeSchema).describe('Changes in this Jenkins change log set.'),
  raw: rawRecordSchema.optional()
});

let testSuiteSchema = z.object({
  name: z.string().optional().describe('JUnit suite name.'),
  id: z.string().optional().describe('Jenkins suite id.'),
  duration: z.number().optional().describe('Suite duration in seconds.'),
  totalCount: z.number().optional().describe('Number of test cases in the suite.'),
  failCount: z.number().optional().describe('Number of failed cases in the suite.'),
  skipCount: z.number().optional().describe('Number of skipped cases in the suite.'),
  passCount: z.number().optional().describe('Number of passed cases in the suite.'),
  timestamp: z.string().optional().describe('Suite timestamp when Jenkins exposes one.'),
  stdout: z.string().optional().describe('Suite stdout when Jenkins exposes it.'),
  stderr: z.string().optional().describe('Suite stderr when Jenkins exposes it.')
});

let testCaseSchema = z.object({
  className: z.string().optional().describe('JUnit test class name.'),
  name: z.string().optional().describe('JUnit test case name.'),
  status: z.string().optional().describe('Jenkins case status, such as PASSED or FAILED.'),
  age: z.number().optional().describe('Consecutive failing build age for this case.'),
  duration: z.number().optional().describe('Case duration in seconds.'),
  errorDetails: z.string().optional().describe('Failure message, when present.'),
  errorStackTrace: z.string().optional().describe('Failure stack trace, when present.'),
  failedSince: z.number().optional().describe('Build number where this case started failing.'),
  skipped: z.boolean().optional().describe('Whether Jenkins marks this case as skipped.'),
  skippedMessage: z.string().optional().describe('Skip reason, when Jenkins exposes one.'),
  stdout: z.string().optional().describe('Case stdout when Jenkins exposes it.'),
  stderr: z.string().optional().describe('Case stderr when Jenkins exposes it.'),
  properties: rawRecordSchema.optional().describe('JUnit case properties, when present.'),
  raw: rawRecordSchema.optional()
});

let flakyFailureSchema = z.object({
  message: z.string().optional().describe('Flaky failure message, when present.'),
  type: z.string().optional().describe('Flaky failure type, when present.'),
  stackTrace: z.string().optional().describe('Flaky failure stack trace, when present.'),
  stdout: z.string().optional().describe('Stdout captured for this flaky failure.'),
  stderr: z.string().optional().describe('Stderr captured for this flaky failure.')
});

let flakyFailureCaseSchema = z.object({
  duration: z.number().optional().describe('Case duration in seconds.'),
  className: z.string().optional().describe('JUnit test class name.'),
  testName: z.string().optional().describe('JUnit test case name.'),
  name: z.string().optional().describe('Alias of testName for compatibility.'),
  status: z.string().optional().describe('Jenkins case status, when exposed by REST.'),
  age: z.number().optional().describe('Consecutive failing build age, when exposed by REST.'),
  skippedMessage: z.string().optional().describe('Skip reason, when Jenkins exposes one.'),
  skipped: z.boolean().optional().describe('Whether Jenkins marks this case as skipped.'),
  errorStackTrace: z.string().optional().describe('Failure stack trace, when present.'),
  errorDetails: z.string().optional().describe('Failure message, when present.'),
  failedSince: z.number().optional().describe('Build number where this case started failing.'),
  stdout: z.string().optional().describe('Case stdout when Jenkins exposes it.'),
  stderr: z.string().optional().describe('Case stderr when Jenkins exposes it.'),
  properties: rawRecordSchema.optional().describe('JUnit case properties, when present.'),
  flakyFailures: z
    .array(flakyFailureSchema)
    .describe('Jenkins JUnit flakyFailure entries for this case.')
});

let createClient = (ctx: { auth: Parameters<typeof createJenkinsClient>[0]['auth'] }) =>
  createJenkinsClient({ auth: ctx.auth });

let readOnlyTool = (params: {
  name: string;
  key: string;
  description: string;
  instructions?: string[];
}) =>
  SlateTool.create(spec, {
    ...params,
    tags: { readOnly: true }
  });

let writeTool = (params: {
  name: string;
  key: string;
  description: string;
  instructions?: string[];
  constraints?: string[];
}) => SlateTool.create(spec, params);

let statusFromColor = (color: string | undefined) => {
  let normalized = color?.replace(/_anime$/, '');
  switch (normalized) {
    case 'blue':
      return 'success';
    case 'red':
      return 'failed';
    case 'yellow':
      return 'unstable';
    case 'aborted':
      return 'aborted';
    case 'disabled':
      return 'disabled';
    case 'notbuilt':
      return 'not_built';
    default:
      return normalized;
  }
};

let buildStatus = (build: JenkinsRecord) => {
  if (asBoolean(build.building)) return 'running';
  let result = asString(build.result);
  return result ? result.toLowerCase() : undefined;
};

let mapRecentBuild = (value: unknown) => {
  let build = asRecord(value);
  return {
    number: asNumber(build.number),
    url: asString(build.url),
    result: asString(build.result) ?? null,
    building: asBoolean(build.building),
    timestamp: asNumber(build.timestamp),
    duration: asNumber(build.duration),
    displayName: asString(build.displayName)
  };
};

let mapBuild = (jobFullName: string, build: JenkinsRecord, includeRaw?: boolean) => ({
  number: asNumber(build.number),
  id: asString(build.id),
  jobFullName,
  url: asString(build.url),
  displayName: asString(build.displayName) ?? asString(build.fullDisplayName),
  fullDisplayName: asString(build.fullDisplayName),
  description: build.description === null ? null : asString(build.description),
  result: build.result === null ? null : asString(build.result),
  status: buildStatus(build),
  building: asBoolean(build.building),
  timestamp: asNumber(build.timestamp),
  duration: asNumber(build.duration),
  estimatedDuration: asNumber(build.estimatedDuration),
  queueId: asNumber(build.queueId),
  keepLog: asBoolean(build.keepLog),
  raw: includeRaw ? build : undefined
});

let mapJob = (job: JenkinsRecord, includeRaw?: boolean) => ({
  name: asString(job.name),
  fullName: asString(job.fullName) ?? asString(job.fullDisplayName) ?? asString(job.name),
  displayName: asString(job.displayName),
  fullDisplayName: asString(job.fullDisplayName),
  url: asString(job.url),
  description: asString(job.description),
  color: asString(job.color),
  status: statusFromColor(asString(job.color)),
  buildable: asBoolean(job.buildable),
  inQueue: asBoolean(job.inQueue),
  nextBuildNumber: asNumber(job.nextBuildNumber),
  jobClass: asString(job._class),
  healthReports: asArray(job.healthReport).map(report => {
    let record = asRecord(report);
    return {
      description: asString(record.description),
      score: asNumber(record.score),
      iconClassName: asString(record.iconClassName)
    };
  }),
  lastBuild: asRecord(job.lastBuild),
  lastCompletedBuild: asRecord(job.lastCompletedBuild),
  lastSuccessfulBuild: asRecord(job.lastSuccessfulBuild),
  lastFailedBuild: asRecord(job.lastFailedBuild),
  recentBuilds: asArray(job.builds).map(mapRecentBuild),
  raw: includeRaw ? job : undefined
});

let mapQueueItem = (queueItem: JenkinsRecord) => {
  let task = asRecord(queueItem.task);
  let executable = asRecord(queueItem.executable);
  return {
    id: asNumber(queueItem.id),
    queueClass: asString(queueItem._class),
    url: asString(queueItem.url),
    blocked: asBoolean(queueItem.blocked),
    buildable: asBoolean(queueItem.buildable),
    pending: asBoolean(queueItem.pending),
    stuck: asBoolean(queueItem.stuck),
    cancelled: asBoolean(queueItem.cancelled),
    why: queueItem.why === null ? null : asString(queueItem.why),
    params: asString(queueItem.params),
    inQueueSince: asNumber(queueItem.inQueueSince),
    buildableStartMilliseconds: asNumber(queueItem.buildableStartMilliseconds),
    timestamp: asNumber(queueItem.timestamp),
    task: Object.keys(task).length
      ? {
          name: asString(task.name),
          fullName: asString(task.fullName),
          url: asString(task.url),
          color: asString(task.color)
        }
      : undefined,
    executable: Object.keys(executable).length
      ? {
          number: asNumber(executable.number),
          url: asString(executable.url)
        }
      : undefined
  };
};

let nonEmptyRecord = (value: unknown) => {
  let record = asRecord(value);
  return Object.keys(record).length > 0 ? record : undefined;
};

let normalizedTestStatus = (value: unknown) => asString(value)?.toUpperCase();

let isFailingTestStatus = (status: string | undefined) =>
  status === 'FAILED' || status === 'REGRESSION';

let countsFromCases = (cases: { status?: string; skipped?: boolean }[]) => {
  let failCount = 0;
  let skipCount = 0;
  let passCount = 0;

  for (let testCase of cases) {
    let status = normalizedTestStatus(testCase.status);
    if (status === 'SKIPPED' || testCase.skipped === true) {
      skipCount += 1;
    } else if (isFailingTestStatus(status)) {
      failCount += 1;
    } else if (status === 'PASSED' || status === 'FIXED') {
      passCount += 1;
    }
  }

  return {
    totalCount: cases.length,
    failCount,
    skipCount,
    passCount
  };
};

let testSuitesFromReport = (report: JenkinsRecord) => {
  let suites: z.infer<typeof testSuiteSchema>[] = [];

  for (let suite of asArray(report.suites)) {
    let record = asRecord(suite);
    let cases = testCasesFromSuite(record, false);
    let counts = countsFromCases(cases);
    suites.push({
      name: asString(record.name),
      id: asString(record.id),
      duration: asNumber(record.duration),
      totalCount: asNumber(record.totalCount) ?? counts.totalCount,
      failCount: asNumber(record.failCount) ?? counts.failCount,
      skipCount: asNumber(record.skipCount) ?? counts.skipCount,
      passCount: asNumber(record.passCount) ?? counts.passCount,
      timestamp: asString(record.timestamp),
      stdout: asString(record.stdout),
      stderr: asString(record.stderr)
    });
  }

  for (let child of asArray(report.childReports)) {
    let childReport = asRecord(asRecord(child).result);
    suites.push(...testSuitesFromReport(childReport));
  }

  return suites;
};

let testCasesFromSuite = (suite: JenkinsRecord, includeRaw: boolean) => {
  let cases: z.infer<typeof testCaseSchema>[] = [];

  for (let testCase of asArray(suite.cases)) {
    let record = asRecord(testCase);
    cases.push({
      className: asString(record.className),
      name: asString(record.name),
      status: asString(record.status),
      age: asNumber(record.age),
      duration: asNumber(record.duration),
      errorDetails: asString(record.errorDetails),
      errorStackTrace: asString(record.errorStackTrace),
      failedSince: asNumber(record.failedSince),
      skipped: asBoolean(record.skipped),
      skippedMessage: asString(record.skippedMessage),
      stdout: asString(record.stdout),
      stderr: asString(record.stderr),
      properties: nonEmptyRecord(record.properties),
      raw: includeRaw ? record : undefined
    });
  }

  return cases;
};

let testCasesFromReport = (report: JenkinsRecord, includeRaw = true) => {
  let cases: z.infer<typeof testCaseSchema>[] = [];

  for (let suite of asArray(report.suites)) {
    cases.push(...testCasesFromSuite(asRecord(suite), includeRaw));
  }

  for (let child of asArray(report.childReports)) {
    let childReport = asRecord(asRecord(child).result);
    cases.push(...testCasesFromReport(childReport, includeRaw));
  }

  return cases;
};

let flakyFailuresFromTestCase = (testCase: JenkinsRecord) =>
  asArray(testCase.flakyFailures).map(value => {
    let record = asRecord(value);
    return {
      message: asString(record.message),
      type: asString(record.type),
      stackTrace: asString(record.stackTrace),
      stdout: asString(record.stdout),
      stderr: asString(record.stderr)
    };
  });

let flakyFailureCasesFromReport = (report: JenkinsRecord) => {
  let cases: z.infer<typeof flakyFailureCaseSchema>[] = [];

  for (let suite of asArray(report.suites)) {
    for (let testCase of asArray(asRecord(suite).cases)) {
      let record = asRecord(testCase);
      let flakyFailures = flakyFailuresFromTestCase(record);
      if (flakyFailures.length === 0) continue;

      let testName = asString(record.name) ?? asString(record.testName);
      cases.push({
        duration: asNumber(record.duration),
        className: asString(record.className),
        testName,
        name: testName,
        status: asString(record.status),
        age: asNumber(record.age),
        skippedMessage: asString(record.skippedMessage),
        skipped: asBoolean(record.skipped),
        errorStackTrace: asString(record.errorStackTrace),
        errorDetails: asString(record.errorDetails),
        failedSince: asNumber(record.failedSince),
        stdout: asString(record.stdout),
        stderr: asString(record.stderr),
        properties: nonEmptyRecord(record.properties),
        flakyFailures
      });
    }
  }

  for (let child of asArray(report.childReports)) {
    let childReport = asRecord(asRecord(child).result);
    cases.push(...flakyFailureCasesFromReport(childReport));
  }

  return cases;
};

let splitLogLines = (text: string) => {
  if (text.length === 0) return [];

  let lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
};

let resolveSearchPattern = (pattern: string | undefined, query: string | undefined) => {
  if (pattern !== undefined && query !== undefined && pattern !== query) {
    throw jenkinsValidationError('Provide either pattern or query, not both.');
  }

  let value = pattern ?? query;
  if (value === undefined || value.length === 0) {
    throw jenkinsValidationError('pattern is required.');
  }

  return value;
};

let resolveBooleanAlias = (
  primary: boolean | undefined,
  alias: boolean | undefined,
  primaryLabel: string,
  aliasLabel: string,
  defaultValue: boolean
) => {
  if (primary !== undefined && alias !== undefined && primary !== alias) {
    throw jenkinsValidationError(`Provide either ${primaryLabel} or ${aliasLabel}, not both.`);
  }

  return primary ?? alias ?? defaultValue;
};

let resolveIgnoreCase = (
  ignoreCase: boolean | undefined,
  caseSensitive: boolean | undefined
) => {
  if (
    ignoreCase !== undefined &&
    caseSensitive !== undefined &&
    ignoreCase === caseSensitive
  ) {
    throw jenkinsValidationError('ignoreCase and caseSensitive conflict. Provide only one.');
  }

  return ignoreCase ?? (caseSensitive === undefined ? false : !caseSensitive);
};

let normalizeContextLines = (value: number | undefined) => {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0) {
    throw jenkinsValidationError('contextLines must be a non-negative number.');
  }
  return Math.min(Math.floor(value), 10);
};

let findMatchingLines = (params: {
  text: string;
  pattern: string;
  useRegex: boolean;
  ignoreCase: boolean;
  maxMatches: number;
  contextLines: number;
}) => {
  let lines = splitLogLines(params.text).map(line => line.trim());
  let matches: {
    matchedLineNumber: number;
    matchedLine: string;
    contextLines: string[];
    contextStartLine: number;
    contextEndLine: number;
    lineNumber: number;
    text: string;
  }[] = [];
  let matcher: (value: string) => boolean;

  if (params.useRegex) {
    let flags = params.ignoreCase ? 'i' : '';
    let pattern: RegExp;
    try {
      pattern = new RegExp(params.pattern, flags);
    } catch {
      throw jenkinsValidationError('pattern must be a valid regular expression.');
    }
    matcher = value => pattern.test(value);
  } else if (params.ignoreCase) {
    let pattern = params.pattern.toLowerCase();
    matcher = value => value.toLowerCase().includes(pattern);
  } else {
    matcher = value => value.includes(params.pattern);
  }

  for (let [index, line] of lines.entries()) {
    if (!matcher(line)) continue;

    if (matches.length >= params.maxMatches) {
      return {
        totalLines: lines.length,
        linesScanned: lines.length,
        matches,
        hasMoreMatches: true,
        truncatedMatches: true
      };
    }

    let contextStartIndex = Math.max(0, index - params.contextLines);
    let contextEndIndex = Math.min(lines.length - 1, index + params.contextLines);
    matches.push({
      matchedLineNumber: index + 1,
      matchedLine: line,
      contextLines: lines.slice(contextStartIndex, contextEndIndex + 1),
      contextStartLine: contextStartIndex + 1,
      contextEndLine: contextEndIndex + 1,
      lineNumber: index + 1,
      text: line
    });
  }

  return {
    totalLines: lines.length,
    linesScanned: lines.length,
    matches,
    hasMoreMatches: false,
    truncatedMatches: false
  };
};

export let getJob = readOnlyTool({
  name: 'Get Job',
  key: 'get_job',
  description:
    'Get Jenkins job details, including status color, buildability, health reports, and recent build references.'
})
  .input(z.object({ ...jobFullNameInput, ...includeRawInput }))
  .output(
    z.object({
      jobFullName: z.string().describe('Jenkins job full name used for the lookup.'),
      job: z.object({
        name: z.string().optional(),
        fullName: z.string().optional(),
        displayName: z.string().optional(),
        fullDisplayName: z.string().optional(),
        url: z.string().optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        status: z.string().optional(),
        buildable: z.boolean().optional(),
        inQueue: z.boolean().optional(),
        nextBuildNumber: z.number().optional(),
        jobClass: z.string().optional(),
        healthReports: z.array(rawRecordSchema),
        lastBuild: rawRecordSchema,
        lastCompletedBuild: rawRecordSchema,
        lastSuccessfulBuild: rawRecordSchema,
        lastFailedBuild: rawRecordSchema,
        recentBuilds: z.array(recentBuildSchema),
        raw: rawRecordSchema.optional()
      })
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let job = await createClient(ctx).getJob(jobFullName);
    if (isFolderJobRecord(job)) {
      throw jenkinsValidationError(
        `Jenkins item "${jobFullName}" is a folder, not a concrete job.`
      );
    }
    return {
      output: {
        jobFullName,
        job: mapJob(job, ctx.input.includeRaw)
      },
      message: `Retrieved Jenkins job **${jobFullName}**.`
    };
  })
  .build();

export let listJobs = readOnlyTool({
  name: 'List Jobs',
  key: 'list_jobs',
  description:
    'List Jenkins jobs in the root or a folder, sorted by name with skip/limit pagination, optional folder recursion, and optional name filtering.'
})
  .input(
    z.object({
      ...folderFullNameInput,
      recursive: z
        .boolean()
        .optional()
        .describe('Recursively traverse Jenkins folders. Defaults to false.'),
      maxDepth: z
        .number()
        .int()
        .positive()
        .max(20)
        .optional()
        .describe('Maximum folder depth to traverse when recursive is true. Defaults to 5.'),
      nameContains: z
        .string()
        .optional()
        .describe('Optional case-insensitive substring filter over job names and full names.'),
      includeFolders: z
        .boolean()
        .optional()
        .describe('Include folder items in results. Defaults to false.'),
      skip: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('0-based start index for the sorted result set. Defaults to 0.'),
      limit: z
        .number()
        .int()
        .positive()
        .max(10)
        .optional()
        .describe('Maximum jobs to return. Defaults to 10 and cannot exceed 10.'),
      ...includeRawInput
    })
  )
  .output(
    z.object({
      folderFullName: z.string().optional().describe('Folder full name used for listing.'),
      count: z.number().describe('Number of jobs returned.'),
      jobs: z.array(jobSummarySchema).describe('Matching Jenkins jobs.')
    })
  )
  .handleInvocation(async ctx => {
    let folderFullName = folderFullNameFromInput(ctx.config, ctx.input.folderFullName);
    let skip = normalizeSkip(ctx.input.skip);
    let limit = normalizeLimit(ctx.input.limit, 10, 10, 'limit');
    let jobs = await createClient(ctx).listJobs({
      folderFullName,
      recursive: ctx.input.recursive,
      maxDepth: ctx.input.maxDepth,
      nameContains: ctx.input.nameContains,
      includeFolders: ctx.input.includeFolders
    });
    let outputJobs = jobs.slice(skip, skip + limit).map(job => ({
      ...job,
      status: statusFromColor(job.color),
      raw: ctx.input.includeRaw ? job.raw : undefined
    }));

    return {
      output: {
        folderFullName,
        count: outputJobs.length,
        jobs: outputJobs
      },
      message: `Listed ${outputJobs.length} Jenkins job${outputJobs.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let triggerBuild = writeTool({
  name: 'Trigger Build',
  key: 'trigger_build',
  description:
    'Trigger a Jenkins job build, using buildWithParameters when parameters are provided and build otherwise.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      parameters: z
        .record(z.string(), buildParameterValueSchema)
        .optional()
        .describe(
          'Optional build parameters as key-value pairs. Values may be strings, numbers, booleans, or arrays of those scalar values. File parameters are not supported.'
        )
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      queueId: z.number().optional().describe('Jenkins queue item id parsed from Location.'),
      queueUrl: z.string().optional().describe('Jenkins queue item URL from Location.')
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let result = await createClient(ctx).triggerBuild(jobFullName, ctx.input.parameters);
    return {
      output: {
        jobFullName,
        ...result
      },
      message: result.queueId
        ? `Triggered Jenkins build for **${jobFullName}** as queue item **${result.queueId}**.`
        : `Triggered Jenkins build for **${jobFullName}**.`
    };
  })
  .build();

export let getQueueItem = readOnlyTool({
  name: 'Get Queue Item',
  key: 'get_queue_item',
  description:
    'Get a Jenkins queue item by id, including task details, scheduling reason, and executable build when assigned.'
})
  .input(
    z.object({
      id: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins queue item id. Matches the Jenkins MCP Server getQueueItem input.'),
      queueId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Compatibility alias for id, matching trigger_build queueId output.'),
      ...includeRawInput
    })
  )
  .output(
    z.object({
      queueItem: queueItemSchema,
      raw: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let id = ctx.input.id ?? ctx.input.queueId;
    if (id === undefined) {
      throw jenkinsValidationError('Provide id, or queueId from trigger_build output.');
    }
    if (
      ctx.input.id !== undefined &&
      ctx.input.queueId !== undefined &&
      ctx.input.id !== ctx.input.queueId
    ) {
      throw jenkinsValidationError('id and queueId must match when both are provided.');
    }

    let raw = await createClient(ctx).getQueueItem(id);
    return {
      output: {
        queueItem: mapQueueItem(raw),
        raw: ctx.input.includeRaw ? raw : undefined
      },
      message: `Retrieved Jenkins queue item **${id}**.`
    };
  })
  .build();

export let getBuild = readOnlyTool({
  name: 'Get Build',
  key: 'get_build',
  description:
    'Get Jenkins build details by build number, defaulting to the last build when no build number is provided. Jenkins last-build selectors such as lastSuccessfulBuild are also supported.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildSelector: buildSelectorSchema,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Build number. When omitted with no buildSelector, Jenkins lastBuild is returned. Required when buildSelector is number.'
        ),
      ...includeRawInput
    })
  )
  .output(z.object({ build: buildSchema }))
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let build = await createClient(ctx).getBuild(
      jobFullName,
      ctx.input.buildSelector as JenkinsBuildSelector | undefined,
      ctx.input.buildNumber
    );
    return {
      output: {
        build: mapBuild(jobFullName, build, ctx.input.includeRaw)
      },
      message: `Retrieved Jenkins build for **${jobFullName}**.`
    };
  })
  .build();

export let updateBuild = writeTool({
  name: 'Update Build',
  key: 'update_build',
  description:
    'Update a Jenkins build display name and/or description through stock Jenkins build HTTP endpoints. Omitted or empty fields are ignored.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number. Defaults to the last build when omitted.'),
      description: z
        .string()
        .optional()
        .describe('New Jenkins build description. Empty strings are ignored.'),
      displayName: z
        .string()
        .optional()
        .describe('New Jenkins build display name. Empty strings are ignored.')
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      buildNumber: z.number(),
      updated: z.boolean().describe('Whether any build metadata field was updated.'),
      updatedDescription: z.boolean().describe('Whether the description was updated.'),
      updatedDisplayName: z.boolean().describe('Whether the display name was updated.')
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let result = await createClient(ctx).updateBuildMetadata(
      jobFullName,
      ctx.input.buildNumber,
      {
        description: ctx.input.description,
        displayName: ctx.input.displayName
      }
    );
    let changedFields = [
      result.updatedDisplayName ? 'display name' : undefined,
      result.updatedDescription ? 'description' : undefined
    ].filter((field): field is string => Boolean(field));

    return {
      output: {
        jobFullName,
        buildNumber: result.buildNumber,
        updated: result.updated,
        updatedDescription: result.updatedDescription,
        updatedDisplayName: result.updatedDisplayName
      },
      message:
        changedFields.length > 0
          ? `Updated ${changedFields.join(' and ')} for Jenkins build **${jobFullName} #${result.buildNumber}**.`
          : `No Jenkins build metadata changes were requested for **${jobFullName} #${result.buildNumber}**.`
    };
  })
  .build();

export let getBuildLog = readOnlyTool({
  name: 'Get Build Log',
  key: 'get_build_log',
  description:
    'Retrieve Jenkins build log lines with forward, end-relative, and cursor pagination.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number. Defaults to the last build when omitted.'),
      skip: z
        .number()
        .int()
        .optional()
        .describe(
          'Line offset for the read. Defaults to 0. Negative values read relative to the end, with -1 starting at the last line. Ignored when cursor is provided.'
        ),
      limit: z
        .number()
        .int()
        .min(-100000)
        .max(100000)
        .optional()
        .describe(
          'Number of lines to return. Defaults to 100. Positive values read forward; negative values read an end-relative window.'
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque cursor from nextCursor. When set, reading resumes from that byte offset and skip is ignored.'
        )
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      buildNumber: z.number(),
      lines: z.array(z.string()).describe('Console log lines in the requested window.'),
      hasMoreContent: z
        .boolean()
        .describe('Whether more log lines exist after the returned window.'),
      startLine: z
        .number()
        .describe('1-based first returned line, or -1 when not known for cursor reads.'),
      endLine: z
        .number()
        .describe('1-based last returned line, or -1 when not known for cursor reads.'),
      totalLines: z
        .number()
        .describe('Exact total for end-relative reads, or -1 for forward and cursor reads.'),
      nextCursor: z
        .string()
        .optional()
        .describe('Opaque cursor to continue reading from the next byte offset.')
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let maxLines = resolveMaxLogLines(ctx.config, undefined);
    let page = await createClient(ctx).getBuildLog({
      jobFullName,
      buildNumber: ctx.input.buildNumber,
      skip: ctx.input.skip,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      maxLines
    });

    return {
      output: {
        jobFullName,
        buildNumber: page.buildNumber,
        lines: page.lines,
        hasMoreContent: page.hasMoreContent,
        startLine: page.startLine,
        endLine: page.endLine,
        totalLines: page.totalLines,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.lines.length} Jenkins build log line${page.lines.length === 1 ? '' : 's'} for **${jobFullName} #${page.buildNumber}**.`
    };
  })
  .build();

export let searchBuildLog = readOnlyTool({
  name: 'Search Build Log',
  key: 'search_build_log',
  description:
    'Search Jenkins build console logs for matching lines, using progressive log reads and bounded result counts.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number. Defaults to the last build when omitted.'),
      pattern: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Search pattern. Plain string by default; regular expression when useRegex is true.'
        ),
      query: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Deprecated alias for pattern. Prefer pattern for Jenkins MCP compatibility.'
        ),
      useRegex: z.boolean().optional().describe('Treat pattern as a regular expression.'),
      regex: z
        .boolean()
        .optional()
        .describe(
          'Deprecated alias for useRegex. Prefer useRegex for Jenkins MCP compatibility.'
        ),
      ignoreCase: z
        .boolean()
        .optional()
        .describe('Use case-insensitive matching. Defaults to false.'),
      caseSensitive: z
        .boolean()
        .optional()
        .describe('Deprecated inverse alias for ignoreCase. Prefer ignoreCase.'),
      start: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Byte offset for Jenkins progressiveText. Defaults to 0.'),
      maxLines: z
        .number()
        .int()
        .positive()
        .max(100000)
        .optional()
        .describe('Maximum log lines to scan. Defaults to config.maxLogLines or 10000.'),
      maxMatches: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum matching lines to return. Defaults to 100 and is capped at 1000.'),
      contextLines: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Number of context lines before and after each match. Defaults to 0 and is capped at 10.'
        )
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      buildNumber: z.number(),
      pattern: z.string(),
      query: z.string().describe('Deprecated alias of pattern for backward compatibility.'),
      useRegex: z.boolean(),
      ignoreCase: z.boolean(),
      start: z.number(),
      nextStart: z.number().optional(),
      moreData: z.boolean(),
      progressive: z.boolean().describe('Whether progressiveText was used.'),
      totalLines: z.number().describe('Total scanned lines in the bounded log snapshot.'),
      linesScanned: z.number(),
      matchCount: z.number(),
      hasMoreMatches: z.boolean(),
      truncatedMatches: z.boolean(),
      matches: z.array(
        z.object({
          matchedLineNumber: z
            .number()
            .describe('1-based line number of the matched line within the scanned snapshot.'),
          matchedLine: z.string().describe('Matching log line.'),
          contextLines: z
            .array(z.string())
            .describe('Matched line plus requested context lines.'),
          contextStartLine: z
            .number()
            .describe(
              '1-based line number of the first context line within the scanned snapshot.'
            ),
          contextEndLine: z
            .number()
            .describe(
              '1-based line number of the last context line within the scanned snapshot.'
            ),
          lineNumber: z.number().describe('Deprecated alias of matchedLineNumber.'),
          text: z.string().describe('Deprecated alias of matchedLine.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let pattern = resolveSearchPattern(ctx.input.pattern, ctx.input.query);
    let useRegex = resolveBooleanAlias(
      ctx.input.useRegex,
      ctx.input.regex,
      'useRegex',
      'regex',
      false
    );
    let ignoreCase = resolveIgnoreCase(ctx.input.ignoreCase, ctx.input.caseSensitive);
    let maxLines = resolveMaxLogLines(ctx.config, ctx.input.maxLines);
    let maxMatches = normalizeLimit(ctx.input.maxMatches, 100, 1000, 'maxMatches');
    let contextLines = normalizeContextLines(ctx.input.contextLines);
    let client = createClient(ctx);
    let build = await client.getBuild(
      jobFullName,
      ctx.input.buildNumber === undefined ? 'lastBuild' : 'number',
      ctx.input.buildNumber,
      'number'
    );
    let buildNumber = asNumber(build.number);
    if (!buildNumber) {
      throw jenkinsValidationError('Jenkins build did not include a numeric build number.');
    }

    let log = await client.readLogUntil({
      jobFullName,
      buildNumber,
      start: ctx.input.start ?? 0,
      maxLines
    });
    let search = findMatchingLines({
      text: log.text,
      pattern,
      useRegex,
      ignoreCase,
      maxMatches,
      contextLines
    });

    return {
      output: {
        jobFullName,
        buildNumber,
        pattern,
        query: pattern,
        useRegex,
        ignoreCase,
        start: log.start,
        nextStart: log.nextStart,
        moreData: log.moreData,
        progressive: log.progressive,
        totalLines: search.totalLines,
        linesScanned: search.linesScanned,
        matchCount: search.matches.length,
        hasMoreMatches: search.hasMoreMatches,
        truncatedMatches: search.truncatedMatches,
        matches: search.matches
      },
      message: `Found ${search.matches.length} matching Jenkins log line${search.matches.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let rebuildBuild = writeTool({
  name: 'Rebuild Build',
  key: 'rebuild_build',
  description:
    'Re-run a Jenkins build. Defaults to the last build, uses Pipeline Replay when available, and otherwise triggers the job with parameters copied from the source build.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number to rebuild. Defaults to the last build.')
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      sourceBuildNumber: z.number(),
      queueId: z.number().optional(),
      queueUrl: z.string().optional(),
      queueItem: queueItemSchema
        .optional()
        .describe('New Jenkins queue item, when it is still available from the queue API.')
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let result = await createClient(ctx).rebuildBuild(jobFullName, ctx.input.buildNumber);
    return {
      output: {
        jobFullName,
        ...result
      },
      message: result.queueId
        ? `Re-triggered Jenkins build **${jobFullName} #${result.sourceBuildNumber}** as queue item **${result.queueId}**.`
        : `Re-triggered Jenkins build **${jobFullName} #${result.sourceBuildNumber}**.`
    };
  })
  .build();

export let getReplayScripts = readOnlyTool({
  name: 'Get Replay Scripts',
  key: 'get_replay_scripts',
  description:
    'Fetch Pipeline Replay main script and loaded scripts for a Jenkins build when the Pipeline Replay HTTP page is available.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number. Defaults to the last build when omitted.')
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      buildNumber: z.number(),
      mainScript: z.string().describe('Main Pipeline script content.'),
      loadedScripts: z
        .record(z.string(), z.string())
        .describe('Loaded scripts keyed by Jenkins Replay loaded script name.')
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let result = await createClient(ctx).getReplayScripts(jobFullName, ctx.input.buildNumber);
    let loadedScriptCount = Object.keys(result.loadedScripts).length;
    return {
      output: {
        jobFullName,
        buildNumber: result.buildNumber,
        mainScript: result.mainScript,
        loadedScripts: result.loadedScripts
      },
      message: `Retrieved Jenkins replay main script and ${loadedScriptCount} loaded script${loadedScriptCount === 1 ? '' : 's'} for **${jobFullName} #${result.buildNumber}**.`
    };
  })
  .build();

export let replayBuild = writeTool({
  name: 'Replay Build',
  key: 'replay_build',
  description:
    'Run Jenkins Pipeline Replay for a build when Jenkins exposes the Pipeline Replay HTTP run endpoint.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number to replay. Defaults to the last build.'),
      mainScript: z.string().min(1).describe('Replacement Pipeline Replay main script.'),
      loadedScripts: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Optional loaded scripts map from original script name to replacement content. When omitted, Jenkins keeps the original loaded scripts.'
        )
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      sourceBuildNumber: z.number(),
      queueId: z.number().optional(),
      queueUrl: z.string().optional(),
      redirectUrl: z
        .string()
        .optional()
        .describe('Replay HTTP redirect target when Jenkins redirects to the job page.'),
      location: z.string().optional().describe('Raw Location header returned by Jenkins.'),
      queueItem: queueItemSchema
        .optional()
        .describe(
          'New Jenkins queue item, when Jenkins exposes a queue URL and it is still available.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let result = await createClient(ctx).replayBuild(
      jobFullName,
      ctx.input.buildNumber,
      ctx.input.mainScript,
      ctx.input.loadedScripts
    );
    let { queueItem, ...replayResult } = result;
    return {
      output: {
        jobFullName,
        ...replayResult,
        queueItem: queueItem ? mapQueueItem(queueItem) : undefined
      },
      message: `Requested Jenkins Pipeline Replay for **${jobFullName} #${result.sourceBuildNumber}**.`
    };
  })
  .build();

export let getTestResults = readOnlyTool({
  name: 'Get Test Results',
  key: 'get_test_results',
  description:
    'Get Jenkins JUnit test report counts, suites, and representative failing test cases for a build.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number. Defaults to the last build when omitted.'),
      onlyFailingTests: z
        .boolean()
        .optional()
        .describe(
          'Return only failing test cases to reduce output size. Matches the Jenkins MCP plugin option and includes FAILED or REGRESSION cases.'
        ),
      includeCases: z
        .boolean()
        .optional()
        .describe(
          'Include individual test cases. Defaults to false unless onlyFailingTests is true.'
        ),
      maxCases: z
        .number()
        .int()
        .positive()
        .max(1000)
        .optional()
        .describe(
          'Maximum individual test cases to return when includeCases or onlyFailingTests is true. Defaults to 100.'
        ),
      ...includeRawInput
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      buildNumber: z.number(),
      totalCount: z.number().optional(),
      failCount: z.number().optional(),
      skipCount: z.number().optional(),
      passCount: z.number().optional(),
      duration: z.number().optional(),
      onlyFailingTests: z.boolean(),
      caseCount: z
        .number()
        .optional()
        .describe(
          'Number of cases matching the requested case filter before maxCases truncation.'
        ),
      returnedCaseCount: z.number().optional(),
      truncatedCases: z.boolean().optional(),
      suites: z.array(testSuiteSchema),
      cases: z.array(testCaseSchema).optional(),
      raw: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let { buildNumber, report } = await createClient(ctx).getTestReportForBuild(
      jobFullName,
      ctx.input.buildNumber
    );
    let failCount = asNumber(report.failCount);
    let skipCount = asNumber(report.skipCount);
    let passCount = asNumber(report.passCount);
    let totalCount =
      asNumber(report.totalCount) ??
      (failCount !== undefined && skipCount !== undefined && passCount !== undefined
        ? failCount + skipCount + passCount
        : undefined);
    passCount =
      passCount ??
      (totalCount !== undefined && failCount !== undefined && skipCount !== undefined
        ? Math.max(totalCount - failCount - skipCount, 0)
        : undefined);
    let allCases = testCasesFromReport(report, ctx.input.includeRaw);
    let onlyFailingTests = ctx.input.onlyFailingTests ?? false;
    let matchingCases = onlyFailingTests
      ? allCases.filter(testCase => isFailingTestStatus(normalizedTestStatus(testCase.status)))
      : allCases;
    let includeCases = ctx.input.includeCases === true || onlyFailingTests;
    let maxCases = normalizeLimit(ctx.input.maxCases, 100, 1000, 'maxCases');
    let cases = includeCases ? matchingCases.slice(0, maxCases) : undefined;

    return {
      output: {
        jobFullName,
        buildNumber,
        totalCount,
        failCount,
        skipCount,
        passCount,
        duration: asNumber(report.duration),
        onlyFailingTests,
        caseCount: includeCases ? matchingCases.length : undefined,
        returnedCaseCount: cases?.length,
        truncatedCases: includeCases ? matchingCases.length > maxCases : undefined,
        suites: testSuitesFromReport(report),
        cases,
        raw: ctx.input.includeRaw ? report : undefined
      },
      message: `Retrieved Jenkins test results for **${jobFullName} #${buildNumber}**.`
    };
  })
  .build();

export let getFlakyFailures = readOnlyTool({
  name: 'Get Flaky Failures',
  key: 'get_flaky_failures',
  description:
    'Retrieve Jenkins JUnit test cases that contain exported flakyFailure entries for a build.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number. Defaults to the last build when omitted.')
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      buildNumber: z.number(),
      count: z.number(),
      failures: z.array(flakyFailureCaseSchema)
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let { buildNumber, report } = await createClient(ctx).getTestReportForBuild(
      jobFullName,
      ctx.input.buildNumber
    );
    let failures = flakyFailureCasesFromReport(report);

    return {
      output: {
        jobFullName,
        buildNumber,
        count: failures.length,
        failures
      },
      message: `Found ${failures.length} likely flaky Jenkins failure${failures.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getJobScm = readOnlyTool({
  name: 'Get Job SCM',
  key: 'get_job_scm',
  description:
    'Read a Jenkins job config.xml and summarize SCM classes, repository URLs, branches, credential ids, and Git SCM configs.'
})
  .input(z.object({ ...jobFullNameInput, ...includeRawInput }))
  .output(
    z.object({
      jobFullName: z.string(),
      scm: scmSummarySchema,
      gitScms: z
        .array(gitScmConfigSchema)
        .describe(
          'Git SCM configurations shaped like the Jenkins MCP plugin getJobScm result.'
        ),
      hasScm: z.boolean().describe('Whether SCM metadata was detected.'),
      raw: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let result = await createClient(ctx).getJobScm(jobFullName);
    let hasScm =
      result.summary.scmClasses.length > 0 ||
      result.summary.urls.length > 0 ||
      result.summary.branches.length > 0;

    return {
      output: {
        jobFullName,
        scm: result.summary,
        gitScms: result.gitScms,
        hasScm,
        raw: ctx.input.includeRaw ? result.parsedConfig : undefined
      },
      message: `Retrieved Jenkins SCM metadata for **${jobFullName}**.`
    };
  })
  .build();

export let getBuildScm = readOnlyTool({
  name: 'Get Build SCM',
  key: 'get_build_scm',
  description:
    'Retrieve Git SCM metadata attached to a Jenkins build, including repository URIs, built branches, and commit when Jenkins exposes Git BuildData.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number. Defaults to the last build when omitted.'),
      ...includeRawInput
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      buildNumber: z.number(),
      scm: scmSummarySchema.extend({
        revisions: z.array(z.string()).describe('SCM revisions detected on the build.')
      }),
      gitScms: z
        .array(gitScmConfigSchema)
        .describe(
          'Git SCM configurations shaped like the Jenkins MCP plugin getBuildScm result.'
        ),
      hasScm: z.boolean().describe('Whether build SCM metadata was detected.'),
      raw: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let result = await createClient(ctx).getBuildScm(jobFullName, ctx.input.buildNumber);
    let buildNumber = asNumber(result.build.number) ?? ctx.input.buildNumber;
    if (!buildNumber) {
      throw jenkinsValidationError('Jenkins build did not include a numeric build number.');
    }
    let hasScm =
      result.gitScms.length > 0 ||
      result.summary.scmClasses.length > 0 ||
      result.summary.urls.length > 0 ||
      result.summary.branches.length > 0 ||
      result.summary.revisions.length > 0;
    return {
      output: {
        jobFullName,
        buildNumber,
        scm: result.summary,
        gitScms: result.gitScms,
        hasScm,
        raw: ctx.input.includeRaw ? result.build : undefined
      },
      message: `Retrieved Jenkins build SCM metadata for **${jobFullName} #${buildNumber}**.`
    };
  })
  .build();

export let getBuildChangesets = readOnlyTool({
  name: 'Get Build Changesets',
  key: 'get_build_changesets',
  description:
    'Get Jenkins build changesets with commit ids, messages, authors, timestamps, and affected paths. Defaults to the last build when no build number is provided.'
})
  .input(
    z.object({
      ...jobFullNameInput,
      buildNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Jenkins build number. Defaults to the last build when omitted.'),
      ...includeRawInput
    })
  )
  .output(
    z.object({
      jobFullName: z.string(),
      buildNumber: z.number(),
      changeCount: z.number(),
      changeSets: z
        .array(buildChangeSetSchema)
        .describe('Jenkins change log sets for the build.'),
      changes: z
        .array(buildChangeSchema)
        .describe('Flattened changes across all Jenkins change log sets.'),
      raw: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let jobFullName = jobFullNameFromInput(ctx.config, ctx.input.jobFullName);
    let result = await createClient(ctx).getBuildChangesets(
      jobFullName,
      ctx.input.buildNumber,
      ctx.input.includeRaw
    );
    return {
      output: {
        jobFullName,
        buildNumber: result.buildNumber,
        changeCount: result.changes.length,
        changeSets: result.changeSets,
        changes: result.changes,
        raw: ctx.input.includeRaw ? result.build : undefined
      },
      message: `Retrieved ${result.changes.length} Jenkins changeset entr${result.changes.length === 1 ? 'y' : 'ies'} for **${jobFullName} #${result.buildNumber}**.`
    };
  })
  .build();

let normalizeFindJobsWithScmUrlSkip = (value: number | undefined) => {
  if (value === undefined || value < 0) return 0;
  return value;
};

let normalizeFindJobsWithScmUrlLimit = (value: number | undefined) => {
  if (value === undefined || value < 0 || value > 10) return 10;
  return value;
};

export let findJobsWithScmUrl = readOnlyTool({
  name: 'Find Jobs With SCM URL',
  key: 'find_jobs_with_scm_url',
  description:
    'Find Jenkins jobs whose Git SCM configuration loosely matches a repository URL and optional branch.'
})
  .input(
    z.object({
      scmUrl: z
        .string()
        .min(1)
        .describe(
          'Git SCM repository URL to match using Jenkins Git plugin loose URL matching.'
        ),
      branch: z
        .string()
        .optional()
        .describe(
          'Optional Git branch name to match against configured Jenkins branch specs.'
        ),
      skip: z
        .number()
        .int()
        .optional()
        .describe(
          'Zero-based offset among matching jobs. Defaults to 0; negative values are treated as 0.'
        ),
      limit: z
        .number()
        .int()
        .optional()
        .describe(
          'Maximum matching jobs to return. Defaults to 10; values below 0 or above 10 are treated as 10.'
        ),
      ...folderFullNameInput,
      ...includeRawInput
    })
  )
  .output(
    z.object({
      scmUrl: z.string(),
      branch: z.string().optional(),
      skip: z.number(),
      limit: z.number(),
      inspectedCount: z.number(),
      skippedCount: z.number(),
      matchCount: z.number(),
      jobs: z.array(
        z.object({
          name: z.string().optional(),
          fullName: z.string().optional(),
          url: z.string().optional(),
          scm: scmSummarySchema,
          raw: rawRecordSchema.optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let folderFullName = folderFullNameFromInput(ctx.config, ctx.input.folderFullName);
    let branch = ctx.input.branch?.trim() || undefined;
    let skip = normalizeFindJobsWithScmUrlSkip(ctx.input.skip);
    let limit = normalizeFindJobsWithScmUrlLimit(ctx.input.limit);
    let jobs = await client.listJobs({
      folderFullName,
      recursive: true,
      includeFolders: false,
      maxDepth: 20
    });
    let skippedCount = 0;
    let matchCount = 0;
    let matches: {
      name?: string;
      fullName?: string;
      url?: string;
      scm: {
        scmClasses: string[];
        urls: string[];
        branches: string[];
        credentialsIds: string[];
      };
      raw?: JenkinsRecord;
    }[] = [];

    for (let job of jobs) {
      if (!job.fullName) continue;
      let scm: Awaited<ReturnType<typeof client.getJobScm>>;
      try {
        scm = await client.getJobScm(job.fullName);
      } catch {
        skippedCount += 1;
        continue;
      }

      let hasMatch = scm.gitScmMatchTargets.some(target =>
        gitScmMatchTargetMatches(target, ctx.input.scmUrl, branch)
      );
      if (hasMatch) {
        if (matchCount >= skip && matches.length < limit) {
          matches.push({
            name: job.name,
            fullName: job.fullName,
            url: job.url,
            scm: scm.summary,
            raw: ctx.input.includeRaw ? job.raw : undefined
          });
        }
        matchCount += 1;
      }
    }

    return {
      output: {
        scmUrl: ctx.input.scmUrl,
        branch,
        skip,
        limit,
        inspectedCount: jobs.length,
        skippedCount,
        matchCount,
        jobs: matches
      },
      message: `Found ${matches.length} Jenkins job${matches.length === 1 ? '' : 's'} matching SCM URL.`
    };
  })
  .build();

export let whoAmI = readOnlyTool({
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Return the Jenkins identity visible to the authenticated API token using /me/api/json.'
})
  .input(z.object({ ...includeRawInput }))
  .output(
    z.object({
      id: z.string().optional().describe('Jenkins user id from /me/api/json.'),
      name: z.string().describe('Alias of fullName for identity display.'),
      fullName: z
        .string()
        .describe('Authenticated Jenkins user full name, matching the Jenkins MCP plugin.'),
      absoluteUrl: z.string().optional(),
      description: z.string().optional(),
      raw: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let me = await createClient(ctx).getMe();
    let fullName = asString(me.fullName) ?? asString(me.id) ?? 'anonymous';
    return {
      output: {
        id: asString(me.id),
        name: fullName,
        fullName,
        absoluteUrl: asString(me.absoluteUrl),
        description: asString(me.description),
        raw: ctx.input.includeRaw ? me : undefined
      },
      message: 'Retrieved Jenkins authenticated user.'
    };
  })
  .build();

export let getStatus = readOnlyTool({
  name: 'Get Status',
  key: 'get_status',
  description:
    'Get Jenkins controller health/readiness, queue, and executor status using /api/json, /queue/api/json, and /computer/api/json.'
})
  .input(z.object({ ...includeRawInput }))
  .output(
    z.object({
      baseUrl: z.string().describe('Jenkins controller base URL.'),
      version: z.string().optional().describe('Jenkins version from response headers.'),
      mode: z.string().optional().describe('Jenkins controller mode.'),
      useSecurity: z.boolean().optional().describe('Whether Jenkins security is enabled.'),
      quietingDown: z.boolean().optional().describe('Whether Jenkins is quieting down.'),
      quietMode: z
        .boolean()
        .optional()
        .describe('Alias of quietingDown, matching the Jenkins MCP Server plugin status map.'),
      quietModeReason: z
        .string()
        .optional()
        .describe('Jenkins quiet-down reason when quiet mode is active.'),
      nodeDescription: z.string().optional().describe('Controller node description.'),
      rootUrl: z
        .string()
        .optional()
        .describe('Configured Jenkins root URL when exposed by REST.'),
      rootUrlStatus: z
        .string()
        .describe(
          'OK when Jenkins root URL is configured, otherwise a configuration warning.'
        ),
      queueLength: z.number().describe('Number of items currently in the Jenkins queue.'),
      fullQueueSize: z
        .number()
        .describe(
          'Full Jenkins queue size, matching the Jenkins MCP Server plugin status map.'
        ),
      buildableQueueSize: z
        .number()
        .describe('Number of Jenkins queue items currently marked buildable.'),
      totalExecutors: z.number().describe('Total executors across returned computers.'),
      busyExecutors: z.number().describe('Executors currently running a build.'),
      availableExecutorsAnyLabel: z
        .number()
        .describe(
          'Executor slots on online computers, matching the Jenkins MCP Server plugin status map label.'
        ),
      offlineNodeCount: z.number().describe('Number of offline computers.'),
      computers: z.array(
        z.object({
          displayName: z.string().optional(),
          offline: z.boolean().optional(),
          temporarilyOffline: z.boolean().optional(),
          numExecutors: z.number().optional(),
          busyExecutors: z.number().optional()
        })
      ),
      raw: rawRecordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let status = await client.getStatus();
    let computerRecords = asArray(status.computers.computer).map(asRecord);
    let computers = computerRecords.map(computer => {
      let executors = asArray(computer.executors).map(asRecord);
      return {
        displayName: asString(computer.displayName),
        offline: asBoolean(computer.offline),
        temporarilyOffline: asBoolean(computer.temporarilyOffline),
        numExecutors: asNumber(computer.numExecutors),
        busyExecutors: executors.filter(
          executor => Object.keys(asRecord(executor.currentExecutable)).length > 0
        ).length
      };
    });
    let queueItems = asArray(status.queue.items).map(asRecord);
    let totalExecutors = computers.reduce(
      (sum, computer) => sum + (computer.numExecutors ?? 0),
      0
    );
    let busyExecutors = computers.reduce(
      (sum, computer) => sum + (computer.busyExecutors ?? 0),
      0
    );
    let availableExecutorsAnyLabel = computers
      .filter(computer => computer.offline !== true)
      .reduce((sum, computer) => sum + (computer.numExecutors ?? 0), 0);
    let offlineNodeCount = computers.filter(computer => computer.offline).length;
    let quietMode = asBoolean(status.root.data.quietingDown);
    let rootUrl = asString(status.root.data.url);

    return {
      output: {
        baseUrl: client.baseUrl,
        version: status.root.version,
        mode: asString(status.root.data.mode),
        useSecurity: asBoolean(status.root.data.useSecurity),
        quietingDown: quietMode,
        quietMode,
        quietModeReason: quietMode
          ? (asString(status.root.data.quietDownReason) ?? 'Unknown')
          : undefined,
        nodeDescription: asString(status.root.data.nodeDescription),
        rootUrl,
        rootUrlStatus: rootUrl
          ? 'OK'
          : 'ERROR: Jenkins root URL is not configured. Configure Jenkins URL under Manage Jenkins > Configure System > Jenkins Location so generated links work correctly.',
        queueLength: queueItems.length,
        fullQueueSize: queueItems.length,
        buildableQueueSize: queueItems.filter(
          queueItem => asBoolean(queueItem.buildable) === true
        ).length,
        totalExecutors,
        busyExecutors,
        availableExecutorsAnyLabel,
        offlineNodeCount,
        computers,
        raw: ctx.input.includeRaw
          ? {
              root: status.root.data,
              queue: status.queue,
              computers: status.computers
            }
          : undefined
      },
      message: `Retrieved Jenkins status with ${queueItems.length} queued item${queueItems.length === 1 ? '' : 's'}.`
    };
  })
  .build();
