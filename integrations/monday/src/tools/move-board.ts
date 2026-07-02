import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { mondayServiceError } from '../lib/errors';
import { spec } from '../spec';

export let moveBoardTool = SlateTool.create(spec, {
  name: 'Move Board',
  key: 'move_board',
  description: `Move a board to another workspace or folder, or change its hierarchy position.`
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to move'),
      workspaceId: z.string().optional().describe('Destination workspace ID'),
      folderId: z.string().optional().describe('Destination folder ID'),
      accountProductId: z.string().optional().describe('Destination product ID'),
      positionObjectId: z
        .string()
        .optional()
        .describe('Object ID to position this board before or after'),
      positionObjectType: z
        .enum(['Board', 'Folder', 'Overview'])
        .optional()
        .describe('Type of object referenced by positionObjectId'),
      positionIsAfter: z
        .boolean()
        .optional()
        .describe('Whether to place the board after the referenced object')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('Moved board ID'),
      success: z.boolean().describe('Whether the hierarchy update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let hasPosition =
      ctx.input.positionObjectId !== undefined || ctx.input.positionObjectType !== undefined;

    if (hasPosition && (!ctx.input.positionObjectId || !ctx.input.positionObjectType)) {
      throw mondayServiceError(
        'positionObjectId and positionObjectType must be provided together.'
      );
    }

    if (
      !ctx.input.workspaceId &&
      !ctx.input.folderId &&
      !ctx.input.accountProductId &&
      !hasPosition
    ) {
      throw mondayServiceError(
        'Provide at least one destination field or position field to move a board.'
      );
    }

    let result = await client.updateBoardHierarchy(ctx.input.boardId, {
      workspace_id: ctx.input.workspaceId,
      folder_id: ctx.input.folderId,
      account_product_id: ctx.input.accountProductId,
      position: hasPosition
        ? {
            object_id: ctx.input.positionObjectId as string,
            object_type: ctx.input.positionObjectType as string,
            is_after: ctx.input.positionIsAfter
          }
        : undefined
    });

    return {
      output: {
        boardId: ctx.input.boardId,
        success: result?.success === true
      },
      message: `Moved board ${ctx.input.boardId}.`
    };
  })
  .build();
