import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

let boardOutputSchema = z.object({
  boardId: z.string().describe('Unique board identifier'),
  title: z.string().describe('Board title')
});

export let listBoards = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `List all boards in Mezmo. Boards are dashboards that allow you to visualize log data with graphs and screens.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      boards: z.array(boardOutputSchema).describe('List of boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let boards = await client.listBoards();

    let mapped = (Array.isArray(boards) ? boards : []).map(b => ({
      boardId: b.boardID || b.id || '',
      title: b.title || ''
    }));

    return {
      output: { boards: mapped },
      message: `Found **${mapped.length}** board(s).`
    };
  })
  .build();

export let createBoard = SlateTool.create(spec, {
  name: 'Create Board',
  key: 'create_board',
  description: `Create a new board (dashboard) in Mezmo for visualizing log data.`,
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      title: z.string().describe('Title for the new board')
    })
  )
  .output(boardOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let result = await client.createBoard({ title: ctx.input.title });

    return {
      output: {
        boardId: result.boardID || result.id || '',
        title: result.title || ''
      },
      message: `Created board **${result.title}** with ID \`${result.boardID || result.id}\`.`
    };
  })
  .build();

export let deleteBoard = SlateTool.create(spec, {
  name: 'Delete Board',
  key: 'delete_board',
  description: `Delete a board (dashboard) from Mezmo.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the board was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    await client.deleteBoard(ctx.input.boardId);

    return {
      output: { deleted: true },
      message: `Deleted board \`${ctx.input.boardId}\`.`
    };
  })
  .build();
