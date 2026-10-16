import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  rawSchema,
  requiredString,
  responseArray,
  responseData,
  responseRecord
} from '../lib/responses';
import { spec } from '../spec';

let boardSchema = z.object({
  boardId: z.string().describe('Board identifier to use when scheduling Pinterest posts'),
  name: z.string().describe('Board display name'),
  raw: rawSchema
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
    let data = responseData(await client.getPinterestBoards(ctx.input.channelId));
    let values = Array.isArray(data)
      ? data
      : responseRecord(data, 'Pinterest response').boards;
    let boards = responseArray(values, 'Pinterest boards').map(value => {
      let board = responseRecord(value, 'Pinterest board');
      return {
        boardId: requiredString(board.value ?? board.id, 'board ID'),
        name: requiredString(board.label ?? board.name, 'board name'),
        raw: board
      };
    });
    return { output: { boards }, message: `Found ${boards.length} Pinterest board(s).` };
  });
