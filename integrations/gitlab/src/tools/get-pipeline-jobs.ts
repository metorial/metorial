import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, gitLabServiceError, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

export let getPipelineJobs = SlateTool.create(spec, {
  name: 'Get Pipeline Jobs',
  key: 'get_pipeline_jobs',
  description: `List all jobs in a CI/CD pipeline, or get details and logs for a specific job. Use this to inspect job statuses, view build logs, retry failed jobs, or cancel running jobs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      pipelineId: z.number().optional().describe('Pipeline ID to list jobs for'),
      jobId: z.number().optional().describe('Specific job ID to get details or logs for'),
      action: z
        .enum(['list', 'get', 'log', 'retry', 'cancel'])
        .optional()
        .describe(
          'Action: list pipeline jobs, get job details, view job log, retry, or cancel. Defaults to "list" if pipelineId given, "get" if jobId given.'
        ),
      perPage: z.number().optional().describe('Results per page for list'),
      page: z.number().optional().describe('Page number for list')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.number().describe('Job ID'),
            jobName: z.string().describe('Job name'),
            stage: z.string().describe('Pipeline stage'),
            status: z.string().describe('Job status'),
            webUrl: z.string().describe('URL to the job'),
            duration: z.number().nullable().describe('Duration in seconds'),
            startedAt: z.string().nullable().describe('Start timestamp'),
            finishedAt: z.string().nullable().describe('Finish timestamp'),
            runner: z.string().nullable().describe('Runner description')
          })
        )
        .optional()
        .describe('List of jobs (for list action)'),
      job: z
        .object({
          jobId: z.number().describe('Job ID'),
          jobName: z.string().describe('Job name'),
          stage: z.string().describe('Pipeline stage'),
          status: z.string().describe('Job status'),
          webUrl: z.string().describe('URL to the job'),
          duration: z.number().nullable().describe('Duration in seconds'),
          startedAt: z.string().nullable().describe('Start timestamp'),
          finishedAt: z.string().nullable().describe('Finish timestamp')
        })
        .optional()
        .describe('Single job details (for get/retry/cancel actions)'),
      log: z.string().optional().describe('Job log output (for log action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let action = ctx.input.action || (ctx.input.pipelineId ? 'list' : 'get');

    if (action === 'list') {
      if (!ctx.input.pipelineId)
        throw gitLabServiceError('Pipeline ID is required to list jobs');
      let jobs = await client.listPipelineJobs(projectId, ctx.input.pipelineId, {
        perPage: ctx.input.perPage,
        page: ctx.input.page
      });

      let mappedJobs = jobs.map((j: any) => ({
        jobId: j.id,
        jobName: j.name,
        stage: j.stage,
        status: j.status,
        webUrl: j.web_url,
        duration: j.duration || null,
        startedAt: j.started_at || null,
        finishedAt: j.finished_at || null,
        runner: j.runner?.description || null
      }));

      return {
        output: { jobs: mappedJobs },
        message: `Found **${mappedJobs.length}** jobs in pipeline #${ctx.input.pipelineId}`
      };
    }

    if (!ctx.input.jobId)
      throw gitLabServiceError('Job ID is required for get/log/retry/cancel actions');

    if (action === 'log') {
      let log = await client.getJobLog(projectId, ctx.input.jobId);
      return {
        output: { log },
        message: `Retrieved log for job **#${ctx.input.jobId}** (${log.length} characters)`
      };
    }

    let job: any;
    if (action === 'retry') {
      job = await client.retryJob(projectId, ctx.input.jobId);
    } else if (action === 'cancel') {
      job = await client.cancelJob(projectId, ctx.input.jobId);
    } else {
      job = await client.getJob(projectId, ctx.input.jobId);
    }

    let actionVerb =
      { get: 'Retrieved', retry: 'Retried', cancel: 'Cancelled' }[action] || 'Retrieved';

    return {
      output: {
        job: {
          jobId: job.id,
          jobName: job.name,
          stage: job.stage,
          status: job.status,
          webUrl: job.web_url,
          duration: job.duration || null,
          startedAt: job.started_at || null,
          finishedAt: job.finished_at || null
        }
      },
      message: `${actionVerb} job **${job.name}** (#${job.id}) — status: **${job.status}**`
    };
  })
  .build();
