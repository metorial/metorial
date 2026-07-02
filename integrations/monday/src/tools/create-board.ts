import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let createBoardTool = SlateTool.create(spec, {
  name: 'Create Board',
  key: 'create_board',
  description: `Create a new board in Monday.com. Specify the board name, visibility type, and optionally assign it to a workspace or folder.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      boardName: z.string().describe('Name of the new board'),
      boardKind: z.enum(['public', 'private', 'share']).describe('Board visibility type'),
      description: z.string().optional().describe('Board description'),
      workspaceId: z.string().optional().describe('Workspace ID to create the board in'),
      folderId: z.string().optional().describe('Folder ID to place the board in'),
      templateId: z.string().optional().describe('Template board ID to duplicate from'),
      empty: z
        .boolean()
        .optional()
        .describe('Create an empty board without monday.com default items'),
      prompt: z
        .string()
        .optional()
        .describe('2026-04 AI prompt to generate board structure and content')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('ID of the newly created board'),
      name: z.string().describe('Name of the board'),
      description: z.string().nullable().describe('Board description'),
      state: z.string().describe('Board state'),
      boardKind: z.string().describe('Board type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let board = await client.createBoard({
      boardName: ctx.input.boardName,
      boardKind: ctx.input.boardKind,
      description: ctx.input.description,
      workspaceId: ctx.input.workspaceId,
      folderId: ctx.input.folderId,
      templateId: ctx.input.templateId,
      empty: ctx.input.empty,
      prompt: ctx.input.prompt
    });

    return {
      output: {
        boardId: String(board.id),
        name: board.name,
        description: board.description || null,
        state: board.state,
        boardKind: board.board_kind
      },
      message: `Created board **${board.name}** (ID: ${board.id}).`
    };
  })
  .build();
