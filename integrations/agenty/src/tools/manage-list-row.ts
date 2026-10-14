import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageListRow = SlateTool.create(spec, {
  key: 'manage_list_row',
  name: 'Manage List Row',
  description:
    'Get, update, or delete one row in a reusable list. Call list_list_rows to discover row IDs. Deleting a row is permanent.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'delete']),
      listId: z
        .string()
        .min(1)
        .describe('List ID. Use manage_list with action list to discover list IDs.'),
      rowId: z.string().min(1).describe('Row _id from list_list_rows.'),
      row: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Column values to send when updating. Required for update; _id is set from rowId.'
        )
    })
  )
  .output(
    z.object({
      listId: z.string(),
      rowId: z.string(),
      row: z.record(z.string(), z.any()).optional(),
      statusCode: z.number().optional(),
      message: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let { action, listId, rowId, row } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    if (action === 'get') {
      let result = await client.getListRow(listId, rowId);
      return {
        output: { listId, rowId, row: result },
        message: `Retrieved row **${rowId}** from list **${listId}**.`
      };
    }
    if (action === 'update' && (!row || !Object.keys(row).some(key => key !== '_id'))) {
      throw createApiServiceError(
        'Provide at least one column value in row when updating a list row.'
      );
    }
    let result =
      action === 'update'
        ? await client.updateListRow(listId, rowId, row!)
        : await client.deleteListRow(listId, rowId);
    return {
      output: {
        listId,
        rowId,
        statusCode: typeof result.status_code === 'number' ? result.status_code : 200,
        message: result.message
      },
      message: `${action === 'update' ? 'Updated' : 'Deleted'} row **${rowId}** in list **${listId}**.`
    };
  })
  .build();
