import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBoardsTool = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `List boards in your Kanbanize account. Optionally filter by workspace or archived status. Returns board details including name, description, and workspace assignment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.number().optional().describe('Filter boards by workspace ID'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Whether to include archived boards. Defaults to false.')
    })
  )
  .output(
    z.object({
      boards: z
        .array(
          z.object({
            boardId: z.number().describe('Board ID'),
            workspaceId: z.number().optional().describe('Workspace ID the board belongs to'),
            name: z.string().optional().describe('Board name'),
            description: z.string().optional().describe('Board description'),
            isArchived: z
              .number()
              .optional()
              .describe('Whether the board is archived (0 or 1)')
          })
        )
        .describe('List of boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listBoards({
      workspaceId: ctx.input.workspaceId,
      isArchived: ctx.input.includeArchived ? undefined : 0
    });

    let boards = Array.isArray(result) ? result : [];

    return {
      output: {
        boards: boards.map((b: any) => ({
          boardId: b.board_id,
          workspaceId: b.workspace_id,
          name: b.name,
          description: b.description,
          isArchived: b.is_archived
        }))
      },
      message: `Found **${boards.length}** board(s).`
    };
  })
  .build();
