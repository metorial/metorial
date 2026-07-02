import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

let boardSchema = z.object({
  boardId: z.string().describe('Unique identifier of the board'),
  name: z.string().describe('Name of the board'),
  postCount: z.number().describe('Number of posts on the board'),
  isPrivate: z.boolean().describe('Whether the board is private'),
  privateComments: z
    .boolean()
    .optional()
    .describe('Whether comments on the board are private'),
  url: z.string().describe('URL of the board'),
  created: z.string().describe('ISO 8601 timestamp of board creation')
});

export let listBoardsTool = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `List all feedback boards in your Canny account. Boards are top-level containers where users post and vote on feedback for specific topics (e.g., "Feature Requests", "Bug Reports").`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      boards: z.array(boardSchema).describe('List of all boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listBoards();

    let boards = (result.boards || []).map((b: any) => ({
      boardId: b.id,
      name: b.name,
      postCount: b.postCount,
      isPrivate: b.isPrivate,
      privateComments: b.privateComments,
      url: b.url,
      created: b.created
    }));

    return {
      output: { boards },
      message: `Found **${boards.length}** board(s): ${boards.map((b: any) => b.name).join(', ') || 'none'}`
    };
  })
  .build();
