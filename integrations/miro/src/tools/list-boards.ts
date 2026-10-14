import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

let queryResultLimit = 10_000;

export let listBoards = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `Lists Miro boards accessible to the authenticated user. Can filter by team or project. Supports pagination.`,
  instructions: [
    'Filtering by teamId or projectId returns results instantly and ignores query. Other filters may take a few seconds for newly created boards.',
    'Query searches expose at most the first 10,000 matches. Narrow the query or filter by teamId or projectId to discover more boards. The final page size is reduced to stay within this window.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z
        .string()
        .optional()
        .describe('Filter by team ID. Call get_current_user to discover the authorized team.'),
      projectId: z.string().optional().describe('Filter boards by project ID'),
      query: z
        .string()
        .optional()
        .describe(
          'Search board names and descriptions; ignored when teamId or projectId is set'
        ),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort order (e.g., "default", "last_modified", "last_opened", "last_created", "alphabetically")'
        ),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of boards to return (default 20, max 50)'),
      offset: z
        .string()
        .regex(/^\d+$/)
        .optional()
        .describe(
          'Zero-based pagination offset; pass the offset returned by the previous page'
        )
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
    let querySearch = Boolean(ctx.input.query && !ctx.input.teamId && !ctx.input.projectId);
    let offset = Number(ctx.input.offset ?? 0);
    if (querySearch && offset >= queryResultLimit) {
      throw createApiServiceError(
        'Miro query searches only expose the first 10,000 matches. Use an offset below 10,000, narrow the query, or filter by teamId or projectId.'
      );
    }
    let limit = querySearch
      ? Math.min(ctx.input.limit ?? 20, queryResultLimit - offset)
      : ctx.input.limit;
    let client = new MiroClient({ token: ctx.auth.token });
    let result = await client.getBoards({
      teamId: ctx.input.teamId,
      projectId: ctx.input.projectId,
      query: ctx.input.query,
      sort: ctx.input.sort,
      limit,
      offset: ctx.input.offset
    });

    let boards = (result.data || []).map((board: any) => ({
      boardId: board.id,
      name: board.name,
      description: board.description ?? undefined,
      viewLink: board.viewLink ?? undefined,
      createdAt: board.createdAt ?? undefined,
      modifiedAt: board.modifiedAt ?? undefined
    }));

    let nextOffset = Number(result.offset ?? ctx.input.offset ?? 0) + boards.length;
    let reachedQueryLimit = querySearch && nextOffset >= queryResultLimit;

    return {
      output: {
        boards,
        total: result.total ?? undefined,
        offset:
          boards.length > 0 && nextOffset < result.total && !reachedQueryLimit
            ? String(nextOffset)
            : undefined
      },
      message: `Found **${boards.length}** board(s)${result.total ? ` out of ${result.total} total` : ''}.${reachedQueryLimit ? " Reached Miro's 10,000-result query window. Narrow the query or filter by teamId or projectId to discover more boards." : ''}`
    };
  })
  .build();
