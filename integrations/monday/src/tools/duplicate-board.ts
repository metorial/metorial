import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let duplicateBoardTool = SlateTool.create(spec, {
  name: 'Duplicate Board',
  key: 'duplicate_board',
  description: `Duplicate a board, optionally into another workspace or folder.`
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to duplicate'),
      duplicateType: z
        .enum([
          'duplicate_board_with_structure',
          'duplicate_board_with_pulses',
          'duplicate_board_with_pulses_and_updates'
        ])
        .default('duplicate_board_with_structure')
        .describe('How much board content to duplicate'),
      boardName: z.string().optional().describe('Name for the duplicated board'),
      workspaceId: z.string().optional().describe('Destination workspace ID'),
      folderId: z.string().optional().describe('Destination folder ID'),
      keepSubscribers: z
        .boolean()
        .optional()
        .describe('Whether to copy subscribers to the duplicated board')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('ID of the duplicated board'),
      name: z.string().describe('Duplicated board name'),
      description: z.string().nullable().describe('Board description'),
      state: z.string().nullable().describe('Board state'),
      boardKind: z.string().nullable().describe('Board kind'),
      workspaceId: z.string().nullable().describe('Workspace ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let board = await client.duplicateBoard({
      boardId: ctx.input.boardId,
      duplicateType: ctx.input.duplicateType,
      boardName: ctx.input.boardName,
      workspaceId: ctx.input.workspaceId,
      folderId: ctx.input.folderId,
      keepSubscribers: ctx.input.keepSubscribers
    });

    return {
      output: {
        boardId: String(board.id),
        name: board.name,
        description: board.description || null,
        state: board.state || null,
        boardKind: board.board_kind || null,
        workspaceId: board.workspace_id ? String(board.workspace_id) : null
      },
      message: `Duplicated board ${ctx.input.boardId} as **${board.name}** (ID: ${board.id}).`
    };
  })
  .build();
