import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let retrieveBoardTool = SlateTool.create(spec, {
  name: 'Retrieve Board',
  key: 'retrieve_board',
  description: `Retrieve details about a specific feedback board by its ID. Returns the board's name, post count, privacy settings, and URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().describe('The ID of the board to retrieve')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('Unique identifier of the board'),
      name: z.string().describe('Name of the board'),
      postCount: z.number().describe('Number of posts on the board'),
      isPrivate: z.boolean().describe('Whether the board is private'),
      privateComments: z
        .boolean()
        .optional()
        .describe('Whether comments on the board are private'),
      url: z.string().describe('URL of the board'),
      created: z.string().describe('ISO 8601 timestamp of board creation'),
      token: z.string().optional().describe('Board token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let b = await client.retrieveBoard(ctx.input.boardId);

    return {
      output: {
        boardId: b.id,
        name: b.name,
        postCount: b.postCount,
        isPrivate: b.isPrivate,
        privateComments: b.privateComments,
        url: b.url,
        created: b.created,
        token: b.token
      },
      message: `Retrieved board **${b.name}** with ${b.postCount} post(s).`
    };
  })
  .build();
