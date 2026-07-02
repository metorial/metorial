import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let boardSchema = z.object({
  boardId: z.string().describe('Unique board ID'),
  name: z.string().describe('Board name'),
  description: z.string().nullable().describe('Board description'),
  state: z.string().describe('Board state (active, archived, deleted)'),
  boardKind: z.string().describe('Board type (public, private, share)'),
  workspaceId: z.string().nullable().describe('Workspace ID the board belongs to'),
  columns: z
    .array(
      z.object({
        columnId: z.string().describe('Column ID'),
        title: z.string().describe('Column title'),
        type: z.string().describe('Column type')
      })
    )
    .describe('Board columns'),
  groups: z
    .array(
      z.object({
        groupId: z.string().describe('Group ID'),
        title: z.string().describe('Group title'),
        color: z.string().describe('Group color')
      })
    )
    .describe('Board groups'),
  owners: z
    .array(
      z.object({
        userId: z.string().describe('Owner user ID'),
        name: z.string().describe('Owner name')
      })
    )
    .describe('Board owners')
});

export let listBoardsTool = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `Retrieve boards from the Monday.com account. Supports filtering by board IDs, workspace, board kind, and state. Returns board metadata including columns, groups, and owners.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardIds: z.array(z.string()).optional().describe('Specific board IDs to retrieve'),
      workspaceIds: z.array(z.string()).optional().describe('Filter boards by workspace IDs'),
      boardKind: z
        .enum(['public', 'private', 'share'])
        .optional()
        .describe('Filter by board type'),
      state: z
        .enum(['active', 'all', 'archived', 'deleted'])
        .optional()
        .describe('Filter by board state'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of boards to return (default: 25)'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      boards: z.array(boardSchema).describe('List of boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let boards = await client.getBoards({
      ids: ctx.input.boardIds,
      workspaceIds: ctx.input.workspaceIds,
      boardKind: ctx.input.boardKind,
      state: ctx.input.state,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let mapped = boards.map((b: any) => ({
      boardId: String(b.id),
      name: b.name,
      description: b.description || null,
      state: b.state,
      boardKind: b.board_kind,
      workspaceId: b.workspace_id ? String(b.workspace_id) : null,
      columns: (b.columns || []).map((c: any) => ({
        columnId: c.id,
        title: c.title,
        type: c.type
      })),
      groups: (b.groups || []).map((g: any) => ({
        groupId: g.id,
        title: g.title,
        color: g.color
      })),
      owners: (b.owners || []).map((o: any) => ({
        userId: String(o.id),
        name: o.name
      }))
    }));

    return {
      output: { boards: mapped },
      message: `Found **${mapped.length}** board(s).`
    };
  })
  .build();
