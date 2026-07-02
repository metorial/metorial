import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRows = SlateTool.create(spec, {
  name: 'Delete Rows',
  key: 'delete_rows',
  description: `Delete one or more rows from a sheet by their IDs. This permanently removes the rows and their data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet'),
      rowIds: z.array(z.string()).describe('IDs of the rows to delete'),
      ignoreRowsNotFound: z
        .boolean()
        .optional()
        .describe('If true, do not error when a row ID is not found')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    await client.deleteRows(ctx.input.sheetId, ctx.input.rowIds, {
      ignoreRowsNotFound: ctx.input.ignoreRowsNotFound
    });

    return {
      output: { success: true },
      message: `Deleted **${ctx.input.rowIds.length}** row(s) from the sheet.`
    };
  })
  .build();
