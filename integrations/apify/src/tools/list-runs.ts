import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let listRuns = SlateTool.create(spec, {
  name: 'List Runs',
  key: 'list_runs',
  description: `List runs for a specific Actor. Returns run metadata including status, timing, and storage IDs. Useful for monitoring Actor execution history and finding completed runs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      actorId: z.string().describe('Actor ID or full name to list runs for'),
      limit: z.number().optional().default(25).describe('Maximum number of runs to return'),
      offset: z.number().optional().default(0).describe('Pagination offset'),
      descending: z
        .boolean()
        .optional()
        .default(true)
        .describe('Sort in descending order (newest first)'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status: READY, RUNNING, SUCCEEDED, FAILED, ABORTING, ABORTED, TIMED-OUT'
        )
    })
  )
  .output(
    z.object({
      runs: z
        .array(
          z.object({
            runId: z.string().describe('Run ID'),
            actorId: z.string().describe('Actor ID'),
            status: z.string().describe('Run status'),
            startedAt: z.string().optional().describe('ISO start timestamp'),
            finishedAt: z.string().optional().describe('ISO finish timestamp'),
            buildId: z.string().optional().describe('Build ID used'),
            defaultDatasetId: z.string().optional().describe('Default dataset ID'),
            defaultKeyValueStoreId: z
              .string()
              .optional()
              .describe('Default key-value store ID')
          })
        )
        .describe('List of runs'),
      total: z.number().describe('Total number of runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let result = await client.listRuns(ctx.input.actorId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      desc: ctx.input.descending,
      status: ctx.input.status
    });

    let runs = result.items.map(item => ({
      runId: item.id,
      actorId: item.actId,
      status: item.status,
      startedAt: item.startedAt,
      finishedAt: item.finishedAt,
      buildId: item.buildId,
      defaultDatasetId: item.defaultDatasetId,
      defaultKeyValueStoreId: item.defaultKeyValueStoreId
    }));

    return {
      output: { runs, total: result.total },
      message: `Found **${result.total}** run(s) for Actor \`${ctx.input.actorId}\`, showing **${runs.length}**.`
    };
  })
  .build();
