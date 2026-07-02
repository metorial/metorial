import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRows = SlateTool.create(spec, {
  name: 'Delete Rows',
  key: 'delete_rows',
  description: `Delete one or more rows from a Baserow table by their row IDs. Supports both single and batch deletion.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableId: z.number().describe('The ID of the table to delete rows from'),
      rowIds: z.array(z.number()).min(1).describe('Array of row IDs to delete')
    })
  )
  .output(
    z.object({
      deletedRowIds: z.array(z.number()).describe('Array of row IDs that were deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteRows(ctx.input.tableId, ctx.input.rowIds);

    return {
      output: { deletedRowIds: ctx.input.rowIds },
      message: `Deleted **${ctx.input.rowIds.length}** row(s) from table ${ctx.input.tableId}.`
    };
  })
  .build();
