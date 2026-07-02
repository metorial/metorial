import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBoard = SlateTool.create(spec, {
  name: 'Delete Board',
  key: 'delete_board',
  description: `Permanently deletes a Miro board. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the board was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    await client.deleteBoard(ctx.input.boardId);

    return {
      output: { deleted: true },
      message: `Deleted board ${ctx.input.boardId}.`
    };
  })
  .build();
