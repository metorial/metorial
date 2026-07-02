import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRowTool = SlateTool.create(spec, {
  name: 'Delete Row',
  key: 'delete_row',
  description: `Delete a single row from a Coda table or view by row ID or name. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table'),
      rowIdOrName: z.string().describe('ID or name of the row to delete')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the asynchronous deletion status'),
      rowId: z.string().describe('ID of the deleted row')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteRow(
      ctx.input.docId,
      ctx.input.tableIdOrName,
      ctx.input.rowIdOrName
    );

    return {
      output: {
        requestId: result.requestId,
        rowId: result.id
      },
      message: `Deleted row **${ctx.input.rowIdOrName}** from table **${ctx.input.tableIdOrName}**.`
    };
  })
  .build();

export let deleteRowsTool = SlateTool.create(spec, {
  name: 'Delete Rows',
  key: 'delete_rows',
  description: `Delete one or more rows from a Coda table. Provide a list of row IDs to remove. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      tableIdOrName: z.string().describe('ID or name of the table'),
      rowIds: z.array(z.string()).describe('IDs of the rows to delete')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the asynchronous mutation status'),
      rowIds: z.array(z.string()).describe('IDs of the deleted rows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteRows(ctx.input.docId, ctx.input.tableIdOrName, {
      rowIds: ctx.input.rowIds
    });

    return {
      output: {
        requestId: result.requestId,
        rowIds: ctx.input.rowIds
      },
      message: `Deleted **${ctx.input.rowIds.length}** row(s) from table **${ctx.input.tableIdOrName}**.`
    };
  })
  .build();
