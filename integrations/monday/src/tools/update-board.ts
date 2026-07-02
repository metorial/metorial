import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let updateBoardTool = SlateTool.create(spec, {
  name: 'Update Board',
  key: 'update_board',
  description: `Update a board's properties such as name, description, or communication settings. Can also archive or delete a board.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to update'),
      name: z.string().optional().describe('New name for the board'),
      description: z.string().optional().describe('New description for the board'),
      action: z
        .enum(['update', 'archive', 'delete'])
        .optional()
        .default('update')
        .describe('Action to perform on the board')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      boardId: z.string().describe('ID of the affected board')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    if (ctx.input.action === 'archive') {
      await client.archiveBoard(ctx.input.boardId);
      return {
        output: { success: true, boardId: ctx.input.boardId },
        message: `Archived board ${ctx.input.boardId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteBoard(ctx.input.boardId);
      return {
        output: { success: true, boardId: ctx.input.boardId },
        message: `Deleted board ${ctx.input.boardId}.`
      };
    }

    if (ctx.input.name) {
      await client.updateBoard(ctx.input.boardId, 'name', ctx.input.name);
    }
    if (ctx.input.description !== undefined) {
      await client.updateBoard(ctx.input.boardId, 'description', ctx.input.description);
    }

    return {
      output: { success: true, boardId: ctx.input.boardId },
      message: `Updated board ${ctx.input.boardId}.`
    };
  })
  .build();
