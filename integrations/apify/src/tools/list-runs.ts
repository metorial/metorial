import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import { mapRun, paginationInput, requireString } from './shared';

export let listRuns = SlateTool.create(spec, {
  name: 'List Runs',
  key: 'list_runs',
  description: `List Apify Actor runs either account-wide or for a specific Actor. Use this to monitor recent runs and find run IDs for status, logs, datasets, or cleanup.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['account', 'actor'])
        .optional()
        .default('actor')
        .describe('Use account for all runs or actor for runs of one Actor'),
      actorId: z
        .string()
        .optional()
        .describe('Actor ID or full name; required when scope is actor'),
      ...paginationInput,
      status: z
        .enum(['READY', 'RUNNING', 'SUCCEEDED', 'FAILED', 'ABORTING', 'ABORTED', 'TIMED-OUT'])
        .optional()
        .describe('Optional run status filter')
    })
  )
  .output(
    z.object({
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Run ID'),
            actorId: z.string().optional().describe('Actor ID'),
            actorTaskId: z.string().optional().describe('Task ID if applicable'),
            status: z.string().optional().describe('Run status'),
            startedAt: z.string().optional(),
            finishedAt: z.string().optional(),
            buildId: z.string().optional(),
            defaultDatasetId: z.string().optional(),
            defaultKeyValueStoreId: z.string().optional(),
            defaultRequestQueueId: z.string().optional()
          })
        )
        .describe('Runs'),
      total: z.number().describe('Total runs matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let actorId =
      ctx.input.scope === 'actor'
        ? requireString(ctx.input.actorId, 'actorId', 'list actor runs')
        : undefined;
    let result = await client.listRuns({
      actorId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      desc: ctx.input.descending,
      status: ctx.input.status
    });

    let runs = result.items.map(mapRun);

    return {
      output: { runs, total: result.total },
      message: `Found **${result.total}** run(s), showing **${runs.length}**.`
    };
  })
  .build();
