import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

let boardOutputSchema = z.object({
  boardId: z.string().min(1).describe('Unique board identifier'),
  accountId: z.string().optional().describe('Organization account identifier, when returned'),
  title: z.string().min(1).describe('Board title')
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
      returnedCount: z.number().describe('Number of items returned'),
      boards: z.array(boardOutputSchema).describe('List of boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let boards = await client.listBoards();

    let mapped = boards.map(b => ({
      boardId: b.boardID,
      accountId: b.account,
      title: b.title
    }));

    return {
      output: { boards: mapped, returnedCount: mapped.length },
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
      title: z.string().min(1).describe('Title for the new board'),
      account: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Organization account identifier from List Boards, if available and required for creation'
        ),
      categories: z
        .array(z.string())
        .optional()
        .describe('Existing board category identifiers')
    })
  )
  .output(boardOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let result = await client.createBoard({
      title: ctx.input.title,
      account: ctx.input.account,
      category: ctx.input.categories
    });

    return {
      output: {
        boardId: result.boardID,
        accountId: result.account,
        title: result.title
      },
      message: `Created board **${result.title}** with ID \`${result.boardID}\`.`
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
      boardId: z.string().min(1).describe('ID of the board to delete')
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
