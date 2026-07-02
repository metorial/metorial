import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRow = SlateTool.create(spec, {
  name: 'Get Row',
  key: 'get_row',
  description: `Retrieve a single row from a Baserow table by its row ID. Returns all field values for the specified row.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableId: z.number().describe('The ID of the table containing the row'),
      rowId: z.number().describe('The ID of the row to retrieve'),
      userFieldNames: z
        .boolean()
        .optional()
        .default(true)
        .describe('Use human-readable field names instead of field IDs')
    })
  )
  .output(
    z.object({
      row: z.record(z.string(), z.any()).describe('The row object with all field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    let row = await client.getRow(
      ctx.input.tableId,
      ctx.input.rowId,
      ctx.input.userFieldNames
    );

    return {
      output: { row },
      message: `Retrieved row **${ctx.input.rowId}** from table ${ctx.input.tableId}.`
    };
  })
  .build();
