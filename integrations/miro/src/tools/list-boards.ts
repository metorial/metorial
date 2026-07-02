import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let listBoards = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `Lists Miro boards accessible to the authenticated user. Can filter by team or project. Supports pagination.`,
  instructions: [
    'Filtering by teamId or projectId returns results instantly. Other filters may take a few seconds for newly created boards.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Filter boards by team ID'),
      projectId: z.string().optional().describe('Filter boards by project ID'),
      query: z.string().optional().describe('Search query to filter boards by name'),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort order (e.g., "default", "last_modified", "last_opened", "last_created", "alphabetically")'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of boards to return (default 20, max 50)'),
      offset: z.string().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      boards: z
        .array(
          z.object({
            boardId: z.string().describe('Board ID'),
            name: z.string().describe('Board name'),
            description: z.string().optional().describe('Board description'),
            viewLink: z.string().optional().describe('Link to view the board'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            modifiedAt: z.string().optional().describe('Last modification timestamp')
          })
        )
        .describe('List of boards'),
      total: z.number().optional().describe('Total number of boards matching the query'),
      offset: z.string().optional().describe('Offset for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let result = await client.getBoards({
      teamId: ctx.input.teamId,
      projectId: ctx.input.projectId,
      query: ctx.input.query,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let boards = (result.data || []).map((board: any) => ({
      boardId: board.id,
      name: board.name,
      description: board.description,
      viewLink: board.viewLink,
      createdAt: board.createdAt,
      modifiedAt: board.modifiedAt
    }));

    return {
      output: {
        boards,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${boards.length}** board(s)${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
