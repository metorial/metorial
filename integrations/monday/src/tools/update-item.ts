import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let updateItemTool = SlateTool.create(spec, {
  name: 'Update Item',
  key: 'update_item',
  description: `Update an item's column values, move it to a different group, archive it, or delete it. For column value updates, provide a JSON object mapping column IDs to their new values.`,
  instructions: [
    'Column values use Monday.com column value JSON format. For example: {"status": {"label": "Working on it"}, "numbers": 42}',
    'Use createLabelsIfMissing to auto-create missing status/dropdown labels.'
  ]
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID the item belongs to'),
      itemId: z.string().describe('ID of the item to update'),
      columnValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Column values to update, mapping column IDs to new values'),
      groupId: z.string().optional().describe('Move the item to this group ID'),
      createLabelsIfMissing: z
        .boolean()
        .optional()
        .describe('Auto-create missing status/dropdown labels'),
      action: z
        .enum(['update', 'archive', 'delete'])
        .optional()
        .default('update')
        .describe('Action to perform')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('ID of the updated item'),
      name: z.string().nullable().describe('Updated item name'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    if (ctx.input.action === 'archive') {
      let result = await client.archiveItem(ctx.input.itemId);
      return {
        output: { itemId: String(result.id), name: result.name || null, success: true },
        message: `Archived item ${ctx.input.itemId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteItem(ctx.input.itemId);
      return {
        output: { itemId: ctx.input.itemId, name: null, success: true },
        message: `Deleted item ${ctx.input.itemId}.`
      };
    }

    let name: string | null = null;

    if (ctx.input.groupId) {
      let result = await client.moveItemToGroup(ctx.input.itemId, ctx.input.groupId);
      name = result.name;
    }

    if (ctx.input.columnValues && Object.keys(ctx.input.columnValues).length > 0) {
      let result = await client.updateColumnValues(
        ctx.input.boardId,
        ctx.input.itemId,
        ctx.input.columnValues,
        ctx.input.createLabelsIfMissing
      );
      name = result.name;
    }

    return {
      output: { itemId: ctx.input.itemId, name, success: true },
      message: `Updated item ${ctx.input.itemId}.`
    };
  })
  .build();
