import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/validation';
import { spec } from '../spec';

export let manageRow = SlateTool.create(spec, {
  name: 'Manage Row',
  key: 'manage_row',
  description: `Create, retrieve, update, or delete a row in a Budibase table. Retrieving a single row returns it enriched with full related row data rather than just the primary display value.`,
  instructions: [
    'For "create", provide the tableId and fields as key-value pairs.',
    'For "update", provide the tableId, rowId, and the fields to change.',
    'Field names must match the column names defined in the table schema.',
    'Updates retain the existing row before applying supplied fields. Coordinate concurrent edits; this read-modify-write operation is not atomic.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('Application ID that the table belongs to'),
      tableId: z.string().describe('Table ID that the row belongs to'),
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('The operation to perform'),
      rowId: z.string().optional().describe('Row ID (required for get, update, delete)'),
      fields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Row field values as key-value pairs (for create and update)')
    })
  )
  .output(
    z.object({
      row: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The row data (not returned for delete)'),
      deleted: z.boolean().optional().describe('Whether the row was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx, ctx.input.appId);
    let { action, tableId, rowId, fields } = ctx.input;

    if (action === 'create') {
      let row = await client.createRow(tableId, fields || {});
      return {
        output: { row },
        message: `Created row **${row._id}** in table ${tableId}.`
      };
    }

    if (!rowId) invalid('rowId is required for get, update, and delete actions');

    if (action === 'get') {
      let row = await client.getRow(tableId, rowId);
      return {
        output: { row },
        message: `Retrieved row **${rowId}** from table ${tableId}.`
      };
    }

    if (action === 'update') {
      if (!fields) invalid('Provide fields to update the row.');
      let row = await client.updateRow(tableId, rowId, fields);
      return {
        output: { row },
        message: `Updated row **${rowId}** in table ${tableId}.`
      };
    }

    await client.deleteRow(tableId, rowId);
    return {
      output: { deleted: true },
      message: `Deleted row **${rowId}** from table ${tableId}.`
    };
  })
  .build();
