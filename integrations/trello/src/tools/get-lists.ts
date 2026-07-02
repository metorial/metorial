import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

let listSchema = z.object({
  listId: z.string().describe('Unique list ID'),
  name: z.string().describe('List name'),
  closed: z.boolean().describe('Whether the list is archived'),
  position: z.number().describe('Position of the list on the board'),
  boardId: z.string().describe('ID of the board this list belongs to')
});

export let getLists = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Get all lists on a Trello board. Lists represent columns (e.g. "To Do", "In Progress", "Done"). Use to discover list IDs needed for creating or moving cards.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to get lists from'),
      filter: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter lists by status. Defaults to "open"')
    })
  )
  .output(
    z.object({
      lists: z.array(listSchema).describe('Lists on the board')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let rawLists = await client.getLists(ctx.input.boardId, ctx.input.filter);

    let lists = rawLists.map((l: any) => ({
      listId: l.id,
      name: l.name,
      closed: l.closed ?? false,
      position: l.pos,
      boardId: l.idBoard
    }));

    return {
      output: { lists },
      message: `Found **${lists.length}** list(s) on the board.`
    };
  })
  .build();
