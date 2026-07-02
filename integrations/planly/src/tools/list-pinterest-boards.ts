import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let boardSchema = z.object({
  boardId: z.string().describe('Board identifier to use when scheduling Pinterest posts'),
  name: z.string().describe('Board display name')
});

export let listPinterestBoards = SlateTool.create(spec, {
  name: 'List Pinterest Boards',
  key: 'list_pinterest_boards',
  description: `Retrieve the list of Pinterest boards for a connected Pinterest channel. A board ID is required when scheduling posts to Pinterest.`,
  instructions: [
    'Use "List Channels" first to find the channelId for a Pinterest channel.',
    'The returned boardId values are used in the Pinterest platform options when scheduling posts.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the connected Pinterest channel')
    })
  )
  .output(
    z.object({
      boards: z.array(boardSchema).describe('List of Pinterest boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPinterestBoards(ctx.input.channelId);
    let data = result.data || result;
    let boards = (data.boards || data || []).map((b: any) => ({
      boardId: b.value || b.id,
      name: b.label || b.name
    }));

    return {
      output: { boards },
      message: `Found ${boards.length} Pinterest board(s).`
    };
  });
