import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateRowTool = SlateTool.create(spec, {
  name: 'Update Row',
  key: 'update_row',
  description: `Update specific cell values of an existing row in a Coda table. Only the provided cells are updated; other cells remain unchanged.`,
  constraints: ['Write operations are asynchronous and return HTTP 202.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table'),
      rowIdOrName: z.string().describe('ID or name of the row to update'),
      cells: z
        .array(
          z.object({
            column: z.string().describe('Column ID or name'),
            value: z.any().describe('New value for the cell')
          })
        )
        .describe('Cell values to update'),
      disableParsing: z
        .boolean()
        .optional()
        .describe('If true, preserve values exactly instead of letting Coda parse strings')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the asynchronous mutation status'),
      rowId: z.string().describe('ID of the updated row')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateRow(
      ctx.input.docId,
      ctx.input.tableIdOrName,
      ctx.input.rowIdOrName,
      {
        row: { cells: ctx.input.cells }
      },
      {
        disableParsing: ctx.input.disableParsing
      }
    );

    return {
      output: {
        requestId: result.requestId,
        rowId: result.id
      },
      message: `Updated row **${ctx.input.rowIdOrName}** in table **${ctx.input.tableIdOrName}**. Request ID: ${result.requestId}`
    };
  })
  .build();
