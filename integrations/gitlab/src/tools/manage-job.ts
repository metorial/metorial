import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, resolveProjectId } from '../lib/helpers';
import { spec } from '../spec';

export let manageJob = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Perform actions on a CI/CD job: get details, retry a failed job, cancel a running job, play a manual job, erase job artifacts/logs, or retrieve the job log output.`,
  instructions: [
    'Use action "get" to fetch full job details.',
    'Use action "log" to retrieve the job trace/log output.',
    'Use action "retry" to retry a failed or canceled job.',
    'Use action "cancel" to cancel a running/pending job.',
    'Use action "play" to start a manual job, optionally with variables.',
    'Use action "erase" to delete job log and artifacts.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path. Falls back to config default.'),
      jobId: z.number().describe('The ID of the job'),
      action: z
        .enum(['get', 'log', 'retry', 'cancel', 'play', 'erase'])
        .describe('Action to perform on the job'),
      variables: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Variables for "play" action on manual jobs')
    })
  )
  .output(
    z.object({
      jobId: z.number().optional(),
      name: z.string().optional(),
      stage: z.string().optional(),
      status: z.string().optional(),
      ref: z.string().optional(),
      duration: z.number().optional().nullable(),
      webUrl: z.string().optional(),
      logContent: z.string().optional(),
      erased: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);
    let { jobId, action } = ctx.input;

    if (action === 'log') {
      let log = await client.getJobLog(projectId, jobId);
      return {
        output: {
          jobId,
          logContent: typeof log === 'string' ? log : String(log)
        },
        message: `Retrieved log for job **#${jobId}**.`
      };
    }

    if (action === 'erase') {
      await client.eraseJob(projectId, jobId);
      return {
        output: { jobId, erased: true },
        message: `Erased artifacts and log for job **#${jobId}**.`
      };
    }

    let j: any;
    if (action === 'get') {
      j = await client.getJob(projectId, jobId);
    } else if (action === 'retry') {
      j = await client.retryJob(projectId, jobId);
    } else if (action === 'cancel') {
      j = await client.cancelJob(projectId, jobId);
    } else {
      j = await client.playJob(projectId, jobId, ctx.input.variables);
    }

    let actionVerb =
      action === 'get'
        ? 'Fetched'
        : action === 'retry'
          ? 'Retried'
          : action === 'cancel'
            ? 'Canceled'
            : 'Played';

    return {
      output: {
        jobId: j.id,
        name: j.name,
        stage: j.stage,
        status: j.status,
        ref: j.ref,
        duration: j.duration,
        webUrl: j.web_url
      },
      message: `${actionVerb} job **${j.name}** (#${j.id}) — status: **${j.status}**.`
    };
  })
  .build();
