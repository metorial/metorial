import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mapRqlResult } from '../lib/client';
import { spec } from '../spec';
import { rqlOutputSchema } from './run-rql-query';

export let manageRqlJob = SlateTool.create(spec, {
  name: 'Manage RQL Job',
  key: 'manage_rql_job',
  description:
    'List project RQL jobs, check a job, retrieve successful results, or cancel a pending query. Requires read scope and the account’s Analyze entitlement. Cancellation can race with completion; the current state is returned.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'results', 'cancel']).describe('Job operation'),
      jobId: z
        .number()
        .optional()
        .describe('Job ID from run_rql_query, required except for list'),
      page: z
        .number()
        .optional()
        .describe(
          'Page number starting at one for list; request successive pages until empty'
        ),
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.')
    })
  )
  .output(
    rqlOutputSchema.partial({ jobId: true, status: true }).extend({
      jobs: z
        .array(
          z.object({
            jobId: z.number(),
            status: z.string(),
            queryString: z.string().optional()
          })
        )
        .optional()
        .describe('Project RQL jobs, including retained historical records')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    if (ctx.input.action === 'list') {
      const jobs = (await client.listRqlJobs(ctx.input.page)).result.map(job => ({
        jobId: job.id,
        status: job.status,
        queryString: typeof job.query_string === 'string' ? job.query_string : undefined
      }));
      return { output: { jobs }, message: `Found ${jobs.length} RQL jobs.` };
    }
    if (ctx.input.jobId === undefined)
      throw createApiServiceError(
        'jobId is required. Use run_rql_query or action list to discover it.'
      );
    let job = (await client.getRqlJob(ctx.input.jobId)).result;
    if (ctx.input.action === 'cancel' && ['new', 'running'].includes(job.status)) {
      try {
        job = (await client.cancelRqlJob(job.id)).result;
      } catch (error) {
        const actual = (await client.getRqlJob(job.id)).result;
        if (!['success', 'failed', 'timed_out', 'cancelled'].includes(actual.status))
          throw error;
        job = actual;
      }
    }
    if (ctx.input.action === 'results' && job.status !== 'success')
      throw createApiServiceError(
        `RQL job is ${job.status}. Check action get until it reaches success before requesting results.`
      );
    const results =
      ctx.input.action === 'results'
        ? mapRqlResult((await client.getRqlJobResult(job.id)).result)
        : {};
    return {
      output: { jobId: job.id, status: job.status, ...results },
      message: `RQL job ${job.id}: ${job.status}.`
    };
  })
  .build();
