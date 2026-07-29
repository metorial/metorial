import { Buffer } from 'node:buffer';
import {
  anyOf,
  createApiServiceError,
  createBase64Attachment,
  createTextAttachment,
  SlateTool
} from 'slates';
import { z } from 'zod';
import {
  GitHubActionsClient,
  type GitHubWorkflowArtifactResponse,
  type GitHubWorkflowJobResponse,
  type GitHubWorkflowResponse,
  type GitHubWorkflowRunResponse,
  normalizeDownloadMimeType,
  parsePositiveResourceId,
  resolveDownloadFileName,
  tailWorkflowLog
} from '../lib/github-actions';
import { spec } from '../spec';

const legacyActions = [
  'list_workflows',
  'list_runs',
  'get_run',
  'trigger',
  'cancel',
  'rerun',
  'list_jobs'
] as const;

const officialMethods = [
  'list_workflows',
  'list_workflow_runs',
  'list_workflow_jobs',
  'list_workflow_run_artifacts',
  'get_workflow',
  'get_workflow_run',
  'get_workflow_job',
  'download_workflow_run_artifact',
  'get_workflow_run_usage',
  'get_workflow_run_logs_url',
  'run_workflow',
  'rerun_workflow_run',
  'rerun_failed_jobs',
  'cancel_workflow_run',
  'delete_workflow_run_logs'
] as const;

type LegacyAction = (typeof legacyActions)[number];
type OfficialMethod = (typeof officialMethods)[number];
type WorkflowOperation = OfficialMethod | 'get_job_logs';

const legacyMethodByAction: Record<LegacyAction, OfficialMethod> = {
  list_workflows: 'list_workflows',
  list_runs: 'list_workflow_runs',
  get_run: 'get_workflow_run',
  trigger: 'run_workflow',
  cancel: 'cancel_workflow_run',
  rerun: 'rerun_workflow_run',
  list_jobs: 'list_workflow_jobs'
};

const workflowEventSchema = z.enum([
  'branch_protection_rule',
  'check_run',
  'check_suite',
  'create',
  'delete',
  'deployment',
  'deployment_status',
  'discussion',
  'discussion_comment',
  'fork',
  'gollum',
  'issue_comment',
  'issues',
  'label',
  'merge_group',
  'milestone',
  'page_build',
  'public',
  'pull_request',
  'pull_request_review',
  'pull_request_review_comment',
  'pull_request_target',
  'push',
  'registry_package',
  'release',
  'repository_dispatch',
  'schedule',
  'status',
  'watch',
  'workflow_call',
  'workflow_dispatch',
  'workflow_run'
]);

const workflowSchema = z.object({
  workflowId: z.number().describe('Workflow ID'),
  name: z.string().describe('Workflow name'),
  path: z.string().describe('Workflow file path'),
  state: z.string().describe('Workflow state'),
  htmlUrl: z.string().nullable().optional().describe('GitHub workflow URL'),
  badgeUrl: z.string().nullable().optional().describe('Workflow badge URL'),
  createdAt: z.string().nullable().optional().describe('Workflow creation time'),
  updatedAt: z.string().nullable().optional().describe('Workflow update time')
});

const runSchema = z.object({
  runId: z.number().describe('Workflow run ID'),
  name: z.string().nullable().describe('Workflow run name'),
  status: z.string().nullable().describe('Workflow run status'),
  conclusion: z.string().nullable().describe('Workflow run conclusion'),
  headBranch: z.string().nullable().describe('Head branch'),
  headSha: z.string().optional().describe('Head commit SHA'),
  event: z.string().describe('Event that started the run'),
  htmlUrl: z.string().describe('GitHub workflow run URL'),
  createdAt: z.string().describe('Workflow run creation time'),
  updatedAt: z.string().optional().describe('Workflow run update time')
});

const jobSchema = z.object({
  jobId: z.number().describe('Workflow job ID'),
  runId: z.number().optional().describe('Workflow run ID'),
  name: z.string().describe('Workflow job name'),
  status: z.string().describe('Workflow job status'),
  conclusion: z.string().nullable().describe('Workflow job conclusion'),
  htmlUrl: z.string().nullable().optional().describe('GitHub workflow job URL'),
  startedAt: z.string().nullable().describe('Job start time'),
  completedAt: z.string().nullable().describe('Job completion time'),
  runnerName: z.string().nullable().optional().describe('Runner name')
});

const artifactSchema = z.object({
  artifactId: z.number().describe('Artifact ID'),
  runId: z.number().nullable().describe('Workflow run ID'),
  name: z.string().describe('Artifact name'),
  byteSize: z.number().nullable().describe('Artifact size in bytes'),
  expired: z.boolean().describe('Whether the artifact has expired'),
  createdAt: z.string().nullable().describe('Artifact creation time'),
  expiresAt: z.string().nullable().describe('Artifact expiration time'),
  downloadUrl: z.string().nullable().describe('GitHub artifact download endpoint')
});

const downloadSchema = z.object({
  artifactId: z.number().describe('Downloaded artifact ID'),
  fileName: z.string().describe('Download file name'),
  mimeType: z.string().describe('Download MIME type'),
  byteSize: z.number().describe('Download size in bytes')
});

const usageSchema = z.object({
  runId: z.number().describe('Workflow run ID'),
  runDurationMs: z.number().nullable().describe('Total run duration in milliseconds'),
  billable: z
    .array(
      z.object({
        operatingSystem: z.string().describe('Billable runner operating system'),
        totalMs: z.number().nullable().describe('Total billed milliseconds'),
        jobs: z.number().nullable().describe('Number of billed jobs'),
        jobRuns: z.array(
          z.object({
            jobId: z.number().nullable().describe('Workflow job ID'),
            durationMs: z.number().nullable().describe('Billed job duration')
          })
        )
      })
    )
    .describe('Billable usage by runner operating system')
});

const logFileSchema = z.object({
  jobId: z.number().describe('Workflow job ID'),
  jobName: z.string().nullable().describe('Workflow job name'),
  fileName: z.string().nullable().describe('Attached log file name'),
  mimeType: z.string().nullable().describe('Attached log MIME type'),
  byteSize: z.number().nullable().describe('Returned log size in bytes'),
  totalLines: z.number().nullable().describe('Total lines in the complete job log'),
  returnedLines: z.number().nullable().describe('Lines included in the returned log'),
  truncated: z.boolean().describe('Whether earlier log lines were omitted'),
  downloadUrl: z.string().describe('Authenticated GitHub job-log download endpoint')
});

type LogFileOutput = z.infer<typeof logFileSchema>;

const fail = (message: string, reason: string): never => {
  throw createApiServiceError(message, { reason });
};

const positiveId = (value: number | undefined, field: string): number => {
  if (value === undefined || !Number.isSafeInteger(value) || value < 1) {
    fail(`${field} must be a positive integer.`, `github_actions_${field}_invalid`);
  }
  return value as number;
};

const nonEmpty = (value: string | undefined, field: string, operation: string): string => {
  if (!value?.trim()) {
    fail(`${field} is required for ${operation}.`, `github_actions_${field}_required`);
  }
  return value as string;
};

const mapWorkflow = (workflow: GitHubWorkflowResponse) => ({
  workflowId: workflow.id,
  name: workflow.name ?? '',
  path: workflow.path ?? '',
  state: workflow.state ?? '',
  htmlUrl: workflow.html_url ?? null,
  badgeUrl: workflow.badge_url ?? null,
  createdAt: workflow.created_at ?? null,
  updatedAt: workflow.updated_at ?? null
});

const mapRun = (run: GitHubWorkflowRunResponse) => ({
  runId: run.id,
  name: run.name ?? null,
  status: run.status ?? null,
  conclusion: run.conclusion ?? null,
  headBranch: run.head_branch ?? null,
  headSha: run.head_sha ?? '',
  event: run.event ?? '',
  htmlUrl: run.html_url ?? '',
  createdAt: run.created_at ?? '',
  updatedAt: run.updated_at ?? ''
});

const mapJob = (job: GitHubWorkflowJobResponse) => ({
  jobId: job.id,
  ...(job.run_id !== undefined ? { runId: job.run_id } : {}),
  name: job.name ?? '',
  status: job.status ?? '',
  conclusion: job.conclusion ?? null,
  htmlUrl: job.html_url ?? null,
  startedAt: job.started_at ?? null,
  completedAt: job.completed_at ?? null,
  runnerName: job.runner_name ?? null
});

const mapArtifact = (artifact: GitHubWorkflowArtifactResponse) => ({
  artifactId: artifact.id,
  runId: artifact.workflow_run?.id ?? null,
  name: artifact.name ?? '',
  byteSize: artifact.size_in_bytes ?? null,
  expired: artifact.expired ?? false,
  createdAt: artifact.created_at ?? null,
  expiresAt: artifact.expires_at ?? null,
  downloadUrl: artifact.archive_download_url ?? null
});

const resolveOperation = (
  action: LegacyAction | undefined,
  method: OfficialMethod | undefined
): WorkflowOperation => {
  const legacyMethod = action === undefined ? undefined : legacyMethodByAction[action];
  if (legacyMethod !== undefined && method !== undefined && legacyMethod !== method) {
    fail(
      `action "${action}" and method "${method}" select different workflow operations.`,
      'github_actions_operation_conflict'
    );
  }
  return method ?? legacyMethod ?? 'get_job_logs';
};

const resolvePagination = (input: { page?: number; perPage?: number; per_page?: number }) => {
  if (
    input.perPage !== undefined &&
    input.per_page !== undefined &&
    input.perPage !== input.per_page
  ) {
    fail(
      'perPage and per_page must match when both are provided.',
      'github_actions_pagination_conflict'
    );
  }
  const page = input.page;
  const perPage = input.per_page ?? input.perPage;
  if (page !== undefined && (!Number.isSafeInteger(page) || page < 1)) {
    fail('page must be a positive integer.', 'github_actions_page_invalid');
  }
  if (
    perPage !== undefined &&
    (!Number.isSafeInteger(perPage) || perPage < 1 || perPage > 100)
  ) {
    fail('per_page must be an integer from 1 through 100.', 'github_actions_per_page_invalid');
  }
  return { page, perPage };
};

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description:
    'List, inspect, download, trigger, rerun, cancel, and troubleshoot GitHub Actions workflows, runs, jobs, artifacts, and logs. Supports the official Actions method contracts and existing action-based calls.',
  instructions: [
    'Use method list_workflows, list_workflow_runs, list_workflow_jobs, or list_workflow_run_artifacts to browse Actions resources.',
    'Use method get_workflow, get_workflow_run, get_workflow_job, get_workflow_run_usage, get_workflow_run_logs_url, or download_workflow_run_artifact with resource_id.',
    'Artifact ZIPs and job log content are returned as downloadable files with metadata in the structured output.',
    'To get one job log, omit action and method and provide job_id. To get every failed job log for a run, provide run_id with failed_only true.',
    'Use return_content true to receive tailed job-log files; otherwise the tool returns authenticated download endpoints.',
    'Existing action values list_workflows, list_runs, get_run, trigger, cancel, rerun, and list_jobs remain supported.'
  ]
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      action: z
        .enum(legacyActions)
        .optional()
        .describe('Existing workflow operation selector'),
      method: z
        .enum(officialMethods)
        .optional()
        .describe('Official GitHub Actions list, get, or run operation'),
      resource_id: z
        .string()
        .optional()
        .describe(
          'Workflow ID or filename for workflow methods; run, job, or artifact ID for other list/get methods'
        ),
      workflow_runs_filter: z
        .object({
          actor: z.string().optional().describe('GitHub login that initiated the run'),
          branch: z.string().optional().describe('Git branch name'),
          event: workflowEventSchema.optional().describe('Event that initiated the run'),
          status: z
            .enum(['queued', 'in_progress', 'completed', 'requested', 'waiting'])
            .optional()
            .describe('Workflow run status')
        })
        .optional()
        .describe('Filters used only by list_workflow_runs'),
      workflow_jobs_filter: z
        .object({
          filter: z
            .enum(['latest', 'all'])
            .optional()
            .describe('Select the latest job attempt or all attempts')
        })
        .optional()
        .describe('Filters used only by list_workflow_jobs'),
      workflow_id: z
        .string()
        .optional()
        .describe('Workflow ID or filename required by run_workflow'),
      run_id: z
        .number()
        .optional()
        .describe('Workflow run ID for run operations or failed-job logs'),
      job_id: z.number().optional().describe('Workflow job ID for a single job-log request'),
      failed_only: z
        .boolean()
        .optional()
        .describe('Get logs for all failed jobs in run_id instead of one job_id'),
      return_content: z
        .boolean()
        .optional()
        .describe('Return requested job-log content as downloadable files instead of URLs'),
      tail_lines: z
        .number()
        .default(500)
        .optional()
        .describe('Lines to return from the end of each requested job log'),
      workflowId: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Existing workflow ID or filename field'),
      runId: z.number().optional().describe('Existing workflow run ID field'),
      ref: z.string().optional().describe('Git ref required by run_workflow or trigger'),
      inputs: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Inputs accepted by the workflow_dispatch event'),
      branch: z.string().optional().describe('Existing workflow-run branch filter'),
      event: z.string().optional().describe('Existing workflow-run event filter'),
      status: z.string().optional().describe('Existing workflow-run status filter'),
      perPage: z.number().optional().describe('Existing results-per-page field'),
      per_page: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page, from 1 through 100'),
      page: z.number().min(1).optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      workflows: z.array(workflowSchema).optional().describe('Workflows returned by a list'),
      workflow: workflowSchema.optional().describe('One workflow'),
      runs: z.array(runSchema).optional().describe('Workflow runs returned by a list'),
      run: runSchema.optional().describe('One workflow run'),
      jobs: z.array(jobSchema).optional().describe('Workflow jobs returned by a list'),
      job: jobSchema.optional().describe('One workflow job'),
      artifacts: z
        .array(artifactSchema)
        .optional()
        .describe('Artifacts from one workflow run'),
      artifactDownload: downloadSchema
        .optional()
        .describe('Metadata for the attached artifact ZIP'),
      usage: usageSchema.optional().describe('Workflow run usage'),
      logsUrl: z
        .string()
        .optional()
        .describe('Authenticated endpoint that redirects to a workflow-run logs ZIP'),
      logFiles: z
        .array(logFileSchema)
        .optional()
        .describe('Job-log file or download metadata'),
      totalJobs: z.number().optional().describe('Jobs found in failed-only log mode'),
      failedJobs: z.number().optional().describe('Failed jobs found in failed-only log mode'),
      triggered: z.boolean().optional().describe('Whether the workflow was triggered'),
      cancelled: z.boolean().optional().describe('Whether the run was cancelled'),
      rerunStarted: z.boolean().optional().describe('Whether the rerun was started'),
      failedJobsRerunStarted: z
        .boolean()
        .optional()
        .describe('Whether failed jobs were queued for rerun'),
      logsDeleted: z.boolean().optional().describe('Whether workflow run logs were deleted')
    })
  )
  .handleInvocation(async ctx => {
    const { owner, repo } = ctx.input;
    const operation = resolveOperation(ctx.input.action, ctx.input.method);
    const pagination = resolvePagination(ctx.input);
    const client = new GitHubActionsClient(ctx.auth);

    if (operation === 'list_workflows') {
      const data = await client.listWorkflows(owner, repo, pagination);
      const workflows = (data.workflows ?? []).map(mapWorkflow);
      return {
        output: { workflows },
        message: `Found **${workflows.length}** workflows in **${owner}/${repo}**.`
      };
    }

    if (operation === 'list_workflow_runs') {
      const officialResourceId = ctx.input.resource_id;
      const legacyResourceId =
        ctx.input.workflowId === undefined ? undefined : String(ctx.input.workflowId);
      if (
        officialResourceId !== undefined &&
        legacyResourceId !== undefined &&
        officialResourceId !== legacyResourceId
      ) {
        fail(
          'resource_id and workflowId must identify the same workflow.',
          'github_actions_workflow_id_conflict'
        );
      }
      const resourceId = officialResourceId ?? legacyResourceId;
      if (resourceId !== undefined && resourceId.trim() === '') {
        fail('resource_id cannot be empty.', 'github_actions_resource_id_invalid');
      }

      const filters = ctx.input.workflow_runs_filter;
      const data = await client.listWorkflowRuns(owner, repo, resourceId, {
        ...pagination,
        actor: filters?.actor,
        branch: filters?.branch ?? ctx.input.branch,
        event: filters?.event ?? ctx.input.event,
        status: filters?.status ?? ctx.input.status
      });
      const runs = (data.workflow_runs ?? []).map(mapRun);
      return {
        output: { runs },
        message: `Found **${runs.length}** workflow runs in **${owner}/${repo}**.`
      };
    }

    if (operation === 'list_workflow_jobs') {
      const runId =
        ctx.input.method === 'list_workflow_jobs'
          ? parsePositiveResourceId(
              nonEmpty(ctx.input.resource_id, 'resource_id', operation),
              operation
            )
          : positiveId(ctx.input.runId, 'runId');
      const data = await client.listWorkflowJobs(owner, repo, runId, {
        ...pagination,
        filter: ctx.input.workflow_jobs_filter?.filter
      });
      const jobs = (data.jobs ?? []).map(mapJob);
      return {
        output: { jobs },
        message: `Found **${jobs.length}** jobs in workflow run **#${runId}**.`
      };
    }

    if (operation === 'list_workflow_run_artifacts') {
      const runId = parsePositiveResourceId(
        nonEmpty(ctx.input.resource_id, 'resource_id', operation),
        operation
      );
      const data = await client.listWorkflowRunArtifacts(owner, repo, runId, pagination);
      const artifacts = (data.artifacts ?? []).map(mapArtifact);
      return {
        output: { artifacts },
        message: `Found **${artifacts.length}** artifacts in workflow run **#${runId}**.`
      };
    }

    if (operation === 'get_workflow') {
      const resourceId = nonEmpty(ctx.input.resource_id, 'resource_id', operation);
      const workflow = mapWorkflow(await client.getWorkflow(owner, repo, resourceId));
      return {
        output: { workflow },
        message: `Retrieved workflow **${workflow.name || resourceId}** in **${owner}/${repo}**.`
      };
    }

    if (operation === 'get_workflow_run') {
      const runId =
        ctx.input.method === 'get_workflow_run'
          ? parsePositiveResourceId(
              nonEmpty(ctx.input.resource_id, 'resource_id', operation),
              operation
            )
          : positiveId(ctx.input.runId, 'runId');
      const run = mapRun(await client.getWorkflowRun(owner, repo, runId));
      return {
        output: { run },
        message: `Workflow run **#${run.runId}**: ${run.status}${run.conclusion ? ` (${run.conclusion})` : ''} — ${run.htmlUrl}`
      };
    }

    if (operation === 'get_workflow_job') {
      const jobId = parsePositiveResourceId(
        nonEmpty(ctx.input.resource_id, 'resource_id', operation),
        operation
      );
      const job = mapJob(await client.getWorkflowJob(owner, repo, jobId));
      return {
        output: { job },
        message: `Retrieved workflow job **#${job.jobId}** in **${owner}/${repo}**.`
      };
    }

    if (operation === 'download_workflow_run_artifact') {
      const artifactId = parsePositiveResourceId(
        nonEmpty(ctx.input.resource_id, 'resource_id', operation),
        operation
      );
      const download = await client.downloadWorkflowArtifact(owner, repo, artifactId);
      const fileName = resolveDownloadFileName(
        download.contentDisposition,
        `${owner}-${repo}-artifact-${artifactId}.zip`
      );
      const mimeType = 'application/zip';
      return {
        output: {
          artifactDownload: {
            artifactId,
            fileName,
            mimeType,
            byteSize: download.byteLength
          }
        },
        attachments: [
          createBase64Attachment(Buffer.from(download.bytes).toString('base64'), mimeType)
        ],
        message: `Downloaded artifact **#${artifactId}** as \`${fileName}\` (${download.byteLength} bytes).`
      };
    }

    if (operation === 'get_workflow_run_usage') {
      const runId = parsePositiveResourceId(
        nonEmpty(ctx.input.resource_id, 'resource_id', operation),
        operation
      );
      const response = await client.getWorkflowRunUsage(owner, repo, runId);
      const usage = {
        runId,
        runDurationMs: response.run_duration_ms ?? null,
        billable: Object.entries(response.billable ?? {}).map(([operatingSystem, item]) => ({
          operatingSystem,
          totalMs: item.total_ms ?? null,
          jobs: item.jobs ?? null,
          jobRuns: (item.job_runs ?? []).map(jobRun => ({
            jobId: jobRun.job_id ?? null,
            durationMs: jobRun.duration_ms ?? null
          }))
        }))
      };
      return {
        output: { usage },
        message: `Retrieved usage for workflow run **#${runId}** in **${owner}/${repo}**.`
      };
    }

    if (operation === 'get_workflow_run_logs_url') {
      const runId = parsePositiveResourceId(
        nonEmpty(ctx.input.resource_id, 'resource_id', operation),
        operation
      );
      const logsUrl = client.workflowRunLogsUrl(owner, repo, runId);
      return {
        output: { logsUrl },
        message: `Returned the authenticated download endpoint for workflow run **#${runId}** logs. The endpoint redirects to a temporary ZIP URL.`
      };
    }

    const officialRunId = ctx.input.run_id;
    const legacyRunId = ctx.input.runId;
    if (
      officialRunId !== undefined &&
      legacyRunId !== undefined &&
      officialRunId !== legacyRunId
    ) {
      fail(
        'run_id and runId must identify the same workflow run.',
        'github_actions_run_id_conflict'
      );
    }

    if (operation === 'run_workflow') {
      const officialWorkflowId = ctx.input.workflow_id;
      const legacyWorkflowId =
        ctx.input.workflowId === undefined ? undefined : String(ctx.input.workflowId);
      if (
        officialWorkflowId !== undefined &&
        legacyWorkflowId !== undefined &&
        officialWorkflowId !== legacyWorkflowId
      ) {
        fail(
          'workflow_id and workflowId must identify the same workflow.',
          'github_actions_workflow_id_conflict'
        );
      }
      const workflowId =
        ctx.input.method === 'run_workflow'
          ? nonEmpty(officialWorkflowId, 'workflow_id', operation)
          : nonEmpty(legacyWorkflowId, 'workflowId', 'trigger');
      const ref = nonEmpty(ctx.input.ref, 'ref', operation);
      await client.runWorkflow(owner, repo, workflowId, ref, ctx.input.inputs);
      return {
        output: { triggered: true },
        message: `Triggered workflow **${workflowId}** on ref \`${ref}\` in **${owner}/${repo}**.`
      };
    }

    if (operation === 'rerun_workflow_run') {
      const runId =
        ctx.input.method === 'rerun_workflow_run'
          ? positiveId(officialRunId, 'run_id')
          : positiveId(legacyRunId, 'runId');
      await client.rerunWorkflowRun(owner, repo, runId);
      return {
        output: { rerunStarted: true },
        message: `Re-running workflow run **#${runId}** in **${owner}/${repo}**.`
      };
    }

    if (operation === 'rerun_failed_jobs') {
      const runId = positiveId(officialRunId, 'run_id');
      await client.rerunFailedJobs(owner, repo, runId);
      return {
        output: { failedJobsRerunStarted: true },
        message: `Re-running failed jobs in workflow run **#${runId}** in **${owner}/${repo}**.`
      };
    }

    if (operation === 'cancel_workflow_run') {
      const runId =
        ctx.input.method === 'cancel_workflow_run'
          ? positiveId(officialRunId, 'run_id')
          : positiveId(legacyRunId, 'runId');
      await client.cancelWorkflowRun(owner, repo, runId);
      return {
        output: { cancelled: true },
        message: `Cancelled workflow run **#${runId}** in **${owner}/${repo}**.`
      };
    }

    if (operation === 'delete_workflow_run_logs') {
      const runId = positiveId(officialRunId, 'run_id');
      await client.deleteWorkflowRunLogs(owner, repo, runId);
      return {
        output: { logsDeleted: true },
        message: `Deleted logs for workflow run **#${runId}** in **${owner}/${repo}**.`
      };
    }

    const failedOnly = ctx.input.failed_only ?? false;
    const returnContent = ctx.input.return_content ?? false;
    const requestedTailLines =
      ctx.input.tail_lines !== undefined &&
      ctx.input.tail_lines > 0 &&
      Number.isSafeInteger(ctx.input.tail_lines)
        ? ctx.input.tail_lines
        : 500;

    if (failedOnly) {
      const runId = positiveId(ctx.input.run_id, 'run_id');
      const jobs = await client.listAllLatestWorkflowJobs(owner, repo, runId);
      const failedJobs = jobs.filter(job => job.conclusion === 'failure');
      const logFiles: LogFileOutput[] = [];
      const attachments: ReturnType<typeof createTextAttachment>[] = [];

      for (const job of failedJobs) {
        const downloadUrl = client.workflowJobLogsUrl(owner, repo, job.id);
        if (!returnContent) {
          logFiles.push({
            jobId: job.id,
            jobName: job.name ?? null,
            fileName: null,
            mimeType: null,
            byteSize: null,
            totalLines: null,
            returnedLines: null,
            truncated: false,
            downloadUrl
          });
          continue;
        }

        const download = await client.downloadWorkflowJobLogs(owner, repo, job.id);
        const tailed = tailWorkflowLog(download.text ?? '', requestedTailLines);
        const fileName = resolveDownloadFileName(
          download.contentDisposition,
          `${owner}-${repo}-${job.name ?? `job-${job.id}`}-${job.id}.log`
        );
        const mimeType = normalizeDownloadMimeType(download.contentType, 'text/plain');
        logFiles.push({
          jobId: job.id,
          jobName: job.name ?? null,
          fileName,
          mimeType,
          byteSize: Buffer.byteLength(tailed.text, 'utf8'),
          totalLines: tailed.totalLines,
          returnedLines: tailed.returnedLines,
          truncated: tailed.truncated,
          downloadUrl
        });
        attachments.push(createTextAttachment(tailed.text, mimeType));
      }

      return {
        output: {
          logFiles,
          totalJobs: jobs.length,
          failedJobs: failedJobs.length
        },
        attachments,
        message:
          failedJobs.length === 0
            ? `No failed jobs were found in workflow run **#${runId}**.`
            : `${returnContent ? 'Returned' : 'Found'} logs for **${failedJobs.length}** failed jobs in workflow run **#${runId}**.`
      };
    }

    const jobId = positiveId(ctx.input.job_id, 'job_id');
    const downloadUrl = client.workflowJobLogsUrl(owner, repo, jobId);
    if (!returnContent) {
      return {
        output: {
          logFiles: [
            {
              jobId,
              jobName: null,
              fileName: null,
              mimeType: null,
              byteSize: null,
              totalLines: null,
              returnedLines: null,
              truncated: false,
              downloadUrl
            }
          ]
        },
        message: `Returned the authenticated download endpoint for workflow job **#${jobId}** logs.`
      };
    }

    const download = await client.downloadWorkflowJobLogs(owner, repo, jobId);
    const tailed = tailWorkflowLog(download.text ?? '', requestedTailLines);
    const fileName = resolveDownloadFileName(
      download.contentDisposition,
      `${owner}-${repo}-job-${jobId}.log`
    );
    const mimeType = normalizeDownloadMimeType(download.contentType, 'text/plain');
    return {
      output: {
        logFiles: [
          {
            jobId,
            jobName: null,
            fileName,
            mimeType,
            byteSize: Buffer.byteLength(tailed.text, 'utf8'),
            totalLines: tailed.totalLines,
            returnedLines: tailed.returnedLines,
            truncated: tailed.truncated,
            downloadUrl
          }
        ]
      },
      attachments: [createTextAttachment(tailed.text, mimeType)],
      message: `Returned the last **${tailed.returnedLines}** lines from workflow job **#${jobId}** as \`${fileName}\`.`
    };
  })
  .build();
