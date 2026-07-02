import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
      rerunOnly: z.boolean().optional().describe('Only return rerun jobs'),
      offsetJobId: z.string().optional().describe('Job ID to use as pagination cursor')
    })
  )
  .output(
    z.object({
      jobSucceededCount: z.number().describe('Total count of succeeded jobs'),
      jobFailedCount: z.number().describe('Total count of failed jobs'),
      jobCount: z.number().describe('Total job count'),
      jobs: z.array(
        z.object({
          jobId: z.string().describe('Job ID/handle'),
          recipeId: z.number().describe('Recipe ID'),
          status: z.string().describe('Job status (succeeded, failed, pending)'),
          isError: z.boolean().describe('Whether the job encountered an error'),
          startedAt: z.string().nullable().describe('Job start timestamp'),
          completedAt: z.string().nullable().describe('Job completion timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listJobs(ctx.input.recipeId, {
      status: ctx.input.status,
      rerunOnly: ctx.input.rerunOnly,
      offsetJobId: ctx.input.offsetJobId
    });

    let jobs = (result.items ?? []).map((j: any) => ({
      jobId: j.id ?? j.handle,
      recipeId: j.recipe_id,
      status: j.status,
      isError: j.is_error ?? false,
      startedAt: j.started_at ?? null,
      completedAt: j.completed_at ?? null
    }));

    return {
      output: {
        jobSucceededCount: result.job_succeeded_count ?? 0,
        jobFailedCount: result.job_failed_count ?? 0,
        jobCount: result.job_count ?? 0,
        jobs
      },
      message: `Recipe **${ctx.input.recipeId}**: ${result.job_succeeded_count ?? 0} succeeded, ${result.job_failed_count ?? 0} failed. Returned **${jobs.length}** jobs.`
    };
  });
