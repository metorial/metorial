import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageListRow = SlateTool.create(spec, {
  name: 'Manage List Row',
  key: 'manage_list_row',
  description: `Add, update, or delete a row in a conversion list. Use this to create new conversion records, update existing rows with new data, or remove rows by row ID or session ID.`,
  instructions: [
    'To add a row, provide listId and rowData.',
    'To update a row, provide listId, rowId, and rowData.',
    'To delete a row, provide listId and either rowId or sessionId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['add', 'update', 'delete'])
        .describe('The operation to perform on the list row'),
      listId: z.string().describe('Unique ID of the target list'),
      rowId: z.string().optional().describe('ID of the row to update or delete'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID to delete the associated row (only for delete action)'),
      rowData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value data for the row (required for add/update)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      row: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The created or updated row data (not returned for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, listId, rowId, sessionId, rowData } = ctx.input;

    if (action === 'add') {
      let row = await client.addListRow(listId, rowData ?? {});
      return {
        output: { success: true, row },
        message: `Added a new row to list \`${listId}\`.`
      };
    }

    if (action === 'update') {
      if (!rowId) {
        throw new Error('rowId is required for update action');
      }
      let row = await client.updateListRow(listId, rowId, rowData ?? {});
      return {
        output: { success: true, row },
        message: `Updated row \`${rowId}\` in list \`${listId}\`.`
      };
    }

    if (action === 'delete') {
      if (sessionId) {
        await client.deleteListRowBySession(listId, sessionId);
        return {
          output: { success: true },
          message: `Deleted row associated with session \`${sessionId}\` from list \`${listId}\`.`
        };
      }
      if (rowId) {
        await client.deleteListRow(listId, rowId);
        return {
          output: { success: true },
          message: `Deleted row \`${rowId}\` from list \`${listId}\`.`
        };
      }
      throw new Error('Either rowId or sessionId is required for delete action');
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
