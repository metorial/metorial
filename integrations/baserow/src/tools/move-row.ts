import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { spec } from '../spec';

export let moveRow = SlateTool.create(spec, {
  name: 'Move Row',
  key: 'move_row',
  description:
    'Move a Baserow row before another row in the same table, or to the end when beforeId is omitted.',
  tags: { destructive: false }
})
  .input(
    z.object({
      tableId: z
        .number()
        .describe(
          'Table ID. Discover with list_token_tables, or list_databases followed by list_tables for JWT connections.'
        ),
      rowId: z.number().describe('Row ID. Discover with list_rows.'),
      beforeId: z.number().optional().describe('Row to move before; omit to move to the end.'),
      userFieldNames: z
        .boolean()
        .optional()
        .default(true)
        .describe('Use human-readable field names in the response.')
    })
  )
  .output(z.object({ row: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let row = await getClient(ctx).moveRow(
      ctx.input.tableId,
      ctx.input.rowId,
      ctx.input.beforeId,
      ctx.input.userFieldNames
    );
    return { output: { row }, message: `Moved row **${ctx.input.rowId}**.` };
  })
  .build();
