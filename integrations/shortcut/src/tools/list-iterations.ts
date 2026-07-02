import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIterations = SlateTool.create(spec, {
  name: 'List Iterations',
  key: 'list_iterations',
  description: `Lists all iterations (sprints) in the workspace with their status, dates, and statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      iterations: z
        .array(
          z.object({
            iterationId: z.number().describe('Iteration ID'),
            name: z.string().describe('Iteration name'),
            appUrl: z.string().describe('URL to view in Shortcut'),
            status: z.string().describe('Current status: unstarted, started, or done'),
            startDate: z.string().describe('Start date'),
            endDate: z.string().describe('End date'),
            groupIds: z.array(z.string()).describe('Assigned team UUIDs'),
            stats: z
              .object({
                numStoriesTotal: z.number().describe('Total stories'),
                numStoriesDone: z.number().describe('Completed stories'),
                numStoriesStarted: z.number().describe('Started stories'),
                numStoriesUnstarted: z.number().describe('Unstarted stories'),
                numPointsTotal: z.number().describe('Total points'),
                numPointsDone: z.number().describe('Completed points')
              })
              .describe('Iteration statistics')
          })
        )
        .describe('List of all iterations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let iterations = await client.listIterations();

    let mapped = iterations.map((it: any) => ({
      iterationId: it.id,
      name: it.name,
      appUrl: it.app_url,
      status: it.status,
      startDate: it.start_date,
      endDate: it.end_date,
      groupIds: it.group_ids || [],
      stats: {
        numStoriesTotal: it.stats?.num_stories_total ?? 0,
        numStoriesDone: it.stats?.num_stories_done ?? 0,
        numStoriesStarted: it.stats?.num_stories_started ?? 0,
        numStoriesUnstarted: it.stats?.num_stories_unstarted ?? 0,
        numPointsTotal: it.stats?.num_points ?? 0,
        numPointsDone: it.stats?.num_points_done ?? 0
      }
    }));

    return {
      output: { iterations: mapped },
      message: `Found **${mapped.length}** iterations`
    };
  })
  .build();
