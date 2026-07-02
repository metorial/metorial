import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let duplicatedItemSchema = z.object({
  itemId: z.string().describe('Duplicated item ID'),
  name: z.string().describe('Duplicated item name'),
  state: z.string().nullable().describe('Item state'),
  groupId: z.string().nullable().describe('Group ID'),
  groupTitle: z.string().nullable().describe('Group title')
});

export let duplicateItemTool = SlateTool.create(spec, {
  name: 'Duplicate Item',
  key: 'duplicate_item',
  description: `Duplicate an item or sub-item, optionally including its updates.`
})
  .input(
    z.object({
      boardId: z.string().describe('Board ID containing the item'),
      itemId: z.string().describe('Item ID to duplicate'),
      withUpdates: z
        .boolean()
        .optional()
        .describe('Whether to duplicate updates asynchronously with the item')
    })
  )
  .output(duplicatedItemSchema)
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let item = await client.duplicateItem(ctx.input.boardId, ctx.input.itemId, {
      withUpdates: ctx.input.withUpdates
    });

    return {
      output: {
        itemId: String(item.id),
        name: item.name,
        state: item.state || null,
        groupId: item.group?.id || null,
        groupTitle: item.group?.title || null
      },
      message: `Duplicated item ${ctx.input.itemId} as **${item.name}** (ID: ${item.id}).`
    };
  })
  .build();
