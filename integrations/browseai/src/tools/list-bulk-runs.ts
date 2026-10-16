import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  bulkRunSummarySchema,
  flag,
  mapBulkRun,
  numeric,
  objects,
  rawSchema
} from '../lib/response';
import { spec } from '../spec';

export let listBulkRuns = SlateTool.create(spec, {
  key: 'list_bulk_runs',
  name: 'List Bulk Runs',
  description:
    'Discover a robot’s bulk runs with status, task counts, and pagination. Call list_robots for robot IDs, then get_bulk_run for task-level results.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      robotId: z.string().describe('Robot ID discovered with list_robots'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of bulk runs'),
      page: z.number().describe('Provider-reported page number'),
      hasMore: z.boolean().describe('Whether another page exists'),
      bulkRuns: z
        .array(bulkRunSummarySchema)
        .describe('Bulk run summaries including IDs and task counts'),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).listBulkRuns(ctx.input.robotId, ctx.input.page);
    let bulkRuns = objects(result.items, 'bulk runs').map(mapBulkRun);
    return {
      output: {
        totalCount: numeric(result.totalCount, 'bulk run total count'),
        page: numeric(result.pageNumber ?? result.page, 'bulk run page number'),
        hasMore: flag(result.hasMore, 'bulk run pagination flag'),
        bulkRuns,
        raw: result
      },
      message: `Retrieved **${bulkRuns.length}** bulk run(s).`
    };
  })
  .build();
