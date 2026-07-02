import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBoards = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `List boards owned by the authenticated user. Supports pagination and filtering by privacy type. Can also search boards by keyword.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter boards by name. If not provided, lists all boards.'),
      privacy: z
        .enum(['PUBLIC', 'SECRET', 'PROTECTED'])
        .optional()
        .describe('Filter boards by privacy type'),
      bookmark: z.string().optional().describe('Pagination bookmark from a previous response'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of boards to return (max 250, default 25)')
    })
  )
  .output(
    z.object({
      boards: z
        .array(
          z.object({
            boardId: z.string().describe('ID of the board'),
            name: z.string().optional().describe('Name of the board'),
            description: z.string().optional().describe('Description of the board'),
            privacy: z.string().optional().describe('Privacy setting'),
            pinCount: z.number().optional().describe('Number of pins'),
            followerCount: z.number().optional().describe('Number of followers'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of boards'),
      bookmark: z.string().optional().describe('Bookmark for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.query) {
      result = await client.searchBoards({
        query: ctx.input.query,
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize
      });
    } else {
      result = await client.listBoards({
        bookmark: ctx.input.bookmark,
        pageSize: ctx.input.pageSize,
        privacy: ctx.input.privacy
      });
    }

    let boards = (result.items || []).map((board: any) => ({
      boardId: board.id,
      name: board.name,
      description: board.description,
      privacy: board.privacy,
      pinCount: board.pin_count,
      followerCount: board.follower_count,
      createdAt: board.created_at
    }));

    return {
      output: {
        boards,
        bookmark: result.bookmark ?? undefined
      },
      message: `Found **${boards.length}** board(s).${result.bookmark ? ' More results available with bookmark.' : ''}`
    };
  })
  .build();
