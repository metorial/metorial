import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient } from '../lib/client';
import { spec } from '../spec';

export let getAsyncJob = SlateTool.create(spec, {
  name: 'Get Async Job',
  key: 'get_async_job',
  description: `Check the status of an async scraping job and optionally retrieve task results. Returns job status, task statuses, and scraped content for completed tasks. Can also list all recent jobs or cancel a running job.`,
  instructions: [
    'Provide a jobId to get the status of a specific job.',
    'Provide both jobId and taskId to get the result of a specific task within a job.',
    'Set action to "list" to see all recent jobs.',
    'Set action to "cancel" to cancel a running job.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['status', 'result', 'list', 'cancel'])
        .describe(
          'Action to perform: "status" to check job progress, "result" to get a task result, "list" to list all jobs, "cancel" to cancel a job'
        ),
      jobId: z
        .string()
        .optional()
        .describe('Job ID (required for status, result, and cancel actions)'),
      taskId: z
        .string()
        .optional()
        .describe('Task ID within the job (required for result action)'),
      page: z.number().optional().describe('Page number for listing jobs (default: 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of jobs per page (default: 10, max: 100)')
    })
  )
  .output(
    z.object({
      jobStatus: z
        .any()
        .optional()
        .describe('Job status details including tasks and their statuses'),
      taskResult: z.any().optional().describe('Task result with scraped content and metadata'),
      jobs: z.any().optional().describe('List of jobs (for list action)'),
      cancelResult: z.any().optional().describe('Cancellation result (for cancel action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapeDoClient(ctx.auth.token);
    let input = ctx.input;

    if (input.action === 'status') {
      if (!input.jobId) throw new Error('jobId is required for status action');
      let status = await client.getAsyncJobStatus(input.jobId);
      return {
        output: {
          jobStatus: status,
          taskResult: null,
          jobs: null,
          cancelResult: null
        },
        message: `Job **${input.jobId}** status: **${status.Status}** — ${status.Tasks?.length || 0} task(s).`
      };
    }

    if (input.action === 'result') {
      if (!input.jobId) throw new Error('jobId is required for result action');
      if (!input.taskId) throw new Error('taskId is required for result action');
      let result = await client.getAsyncTaskResult(input.jobId, input.taskId);
      return {
        output: {
          jobStatus: null,
          taskResult: result,
          jobs: null,
          cancelResult: null
        },
        message: `Task **${input.taskId}** — status: **${result.Status}**, URL: ${result.URL}, HTTP ${result.StatusCode}.`
      };
    }

    if (input.action === 'list') {
      let jobs = await client.listAsyncJobs(input.page || 1, input.pageSize || 10);
      return {
        output: {
          jobStatus: null,
          taskResult: null,
          jobs,
          cancelResult: null
        },
        message: `Retrieved list of async jobs.`
      };
    }

    if (input.action === 'cancel') {
      if (!input.jobId) throw new Error('jobId is required for cancel action');
      let result = await client.cancelAsyncJob(input.jobId);
      return {
        output: {
          jobStatus: null,
          taskResult: null,
          jobs: null,
          cancelResult: result
        },
        message: `Cancelled job **${input.jobId}**.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
