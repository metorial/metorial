import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getListRow = SlateTool.create(spec, {
  name: 'Get List Row',
  key: 'get_list_row',
  description:
    'Retrieve one row from a conversion list. Call get_lists and get_list_rows to discover the list and row IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      listId: z.string().min(1).describe('List ID from get_lists'),
      rowId: z.string().min(1).describe('Row ID from get_list_rows')
    })
  )
  .output(
    z.object({ row: z.unknown().describe('Unmodified list row response from Sidetracker') })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let row = await client.getListRow(ctx.input.listId, ctx.input.rowId);
    return {
      output: { row },
      message: `Retrieved row \`${ctx.input.rowId}\` from list \`${ctx.input.listId}\`.`
    };
  })
  .build();
