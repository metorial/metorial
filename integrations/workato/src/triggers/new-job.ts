import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let newJobTrigger = SlateTrigger.create(spec, {
  name: 'New Job Execution',
  key: 'new_job',
  description:
    'Triggers when a recipe job completes (succeeded or failed). Monitors job execution history for a specific recipe.'
})
  .input(
    z.object({
      jobId: z.string().describe('Job ID'),
      recipeId: z.number().describe('Recipe ID'),
      status: z.string().describe('Job status'),
      isError: z.boolean().describe('Whether the job errored'),
      startedAt: z.string().nullable().describe('Job start time'),
      completedAt: z.string().nullable().describe('Job completion time')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job ID/handle'),
      recipeId: z.number().describe('Recipe ID'),
      status: z.string().describe('Job status (succeeded, failed, pending)'),
      isError: z.boolean().describe('Whether the job encountered an error'),
      startedAt: z.string().nullable().describe('Job start timestamp'),
      completedAt: z.string().nullable().describe('Job completion timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let state = ctx.state as { lastJobId?: string; recipeIds?: string[] } | undefined;
      let lastJobId = state?.lastJobId;

      // Get the list of all recipes to monitor
      let recipesResult = await client.listRecipes({ running: true, perPage: 100 });
      let recipes = recipesResult.items ?? [];

      let allJobs: Array<{
        jobId: string;
        recipeId: number;
        status: string;
        isError: boolean;
        startedAt: string | null;
        completedAt: string | null;
      }> = [];

      // Poll jobs from running recipes (limit to first 10 for performance)
      let recipesToPoll = recipes.slice(0, 10);
      for (let recipe of recipesToPoll) {
        try {
          let jobsResult = await client.listJobs(String(recipe.id), {});
          let jobs = jobsResult.items ?? [];
          for (let job of jobs) {
            let jobId = job.id ?? job.handle;
            if (lastJobId && jobId <= lastJobId) continue;
            allJobs.push({
              jobId,
              recipeId: job.recipe_id ?? recipe.id,
              status: job.status,
              isError: job.is_error ?? false,
              startedAt: job.started_at ?? null,
              completedAt: job.completed_at ?? null
            });
          }
        } catch {
          // Skip recipes where we can't access jobs
        }
      }

      let newLastJobId = lastJobId;
      if (allJobs.length > 0) {
        let sortedIds = allJobs.map(j => j.jobId).sort();
        newLastJobId = sortedIds[sortedIds.length - 1];
      }

      return {
        inputs: lastJobId ? allJobs : [], // Skip first poll to establish baseline
        updatedState: {
          lastJobId: newLastJobId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.isError ? 'job.failed' : `job.${ctx.input.status}`,
        id: `job-${ctx.input.jobId}`,
        output: {
          jobId: ctx.input.jobId,
          recipeId: ctx.input.recipeId,
          status: ctx.input.status,
          isError: ctx.input.isError,
          startedAt: ctx.input.startedAt,
          completedAt: ctx.input.completedAt
        }
      };
    }
  });
