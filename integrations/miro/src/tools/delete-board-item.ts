import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBoardItem = SlateTool.create(spec, {
  name: 'Delete Board Item',
  key: 'delete_board_item',
  description: `Deletes an item from a Miro board. Works for any item type (sticky notes, cards, shapes, text, images, etc.).`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board containing the item'),
      itemId: z.string().describe('ID of the item to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the item was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    await client.deleteItem(ctx.input.boardId, ctx.input.itemId);

    return {
      output: { deleted: true },
      message: `Deleted item ${ctx.input.itemId} from board ${ctx.input.boardId}.`
    };
  })
  .build();
