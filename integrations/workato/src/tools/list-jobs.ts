import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { field, malformed, numericId, records } from '../lib/validation';
import { spec } from '../spec';

export let listJobsTool = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `Retrieve job execution history for a specific recipe. Filter by status to see only succeeded, failed, or pending jobs. Returns aggregated counts and individual job metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recipeId: z.string().describe('ID of the recipe to list jobs for'),
      status: z
        .enum(['succeeded', 'failed', 'pending'])
        .optional()
        .describe('Filter jobs by status'),
      prev: z
        .boolean()
        .optional()
        .describe('Native paging direction: false returns older jobs, true newer jobs.'),
      rerunOnly: z.boolean().optional().describe('Only return rerun jobs'),
      offsetJobId: z.string().optional().describe('Job ID to use as pagination cursor')
    })
  )
  .output(
    z.object({
      jobSucceededCount: z.number().optional().describe('Total count of succeeded jobs'),
      jobFailedCount: z.number().optional().describe('Total count of failed jobs'),
      jobCount: z.number().optional().describe('Total job count'),
      jobs: z.array(
        z.object({
          jobId: z.string().optional().describe('Job ID/handle'),
          recipeId: z.number().optional().describe('Recipe ID'),
          status: z.string().optional().describe('Job status (succeeded, failed, pending)'),
          isError: z.boolean().optional().describe('Whether the job encountered an error'),
          startedAt: z.string().nullable().optional().describe('Job start timestamp'),
          completedAt: z.string().nullable().optional().describe('Job completion timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = await client.listJobs(ctx.input.recipeId, ctx.input);
    const jobs = records(result.items).map(map.job);
    if (jobs.some(job => String(job.recipeId) !== numericId(ctx.input.recipeId, 'recipeId')))
      malformed();
    return {
      output: {
        jobs,
        jobSucceededCount: field(
          result,
          'job_succeeded_count',
          z.number().int().nonnegative().optional()
        ),
        jobFailedCount: field(
          result,
          'job_failed_count',
          z.number().int().nonnegative().optional()
        ),
        jobCount: field(result, 'job_count', z.number().int().nonnegative().optional())
      },
      message: `Returned ${jobs.length} jobs. Continue with offsetJobId and the same direction.`
    };
  });
