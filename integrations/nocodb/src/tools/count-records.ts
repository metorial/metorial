import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireRecord, tableIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let countRecords = SlateTool.create(spec, {
  key: 'count_records',
  name: 'Count Records',
  description:
    'Count records in a table or view, optionally applying a where filter without retrieving every record.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      tableId: tableIdSchema,
      where: z
        .string()
        .optional()
        .describe(
          'NocoDB v2 where filter, applied together with view filters when viewId is supplied'
        ),
      viewId: z.string().optional().describe('View ID from list_views')
    })
  )
  .output(z.object({ count: z.number(), raw: z.any() }))
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let raw = requireRecord(
      await client.countRecords(ctx.input.tableId, {
        where: ctx.input.where,
        viewId: ctx.input.viewId
      }),
      'record count'
    );
    if (typeof raw.count !== 'number')
      throw createApiServiceError('NocoDB did not return a numeric record count.', {
        reason: 'invalid_response'
      });
    return {
      output: { count: raw.count, raw },
      message: `Found **${raw.count}** matching record(s).`
    };
  })
  .build();
