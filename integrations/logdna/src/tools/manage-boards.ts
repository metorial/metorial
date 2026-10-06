import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let widgetSchema = z.object({
  title: z.string().optional().describe('Title of the widget'),
  query: z.string().optional().describe('Log query for the widget'),
  type: z.string().optional().describe('Widget type (e.g., graph, count)'),
  description: z.string().optional().describe('Description of the widget')
});

let boardOutputSchema = z.object({
  boardId: z.string().describe('Unique ID of the board'),
  title: z.string().optional().describe('Title of the board'),
  widgets: z.array(z.any()).optional().describe('List of widgets on the board'),
  account: z.string().optional().describe('Account number associated with the board'),
  category: z.array(z.string()).optional().describe('Board category IDs')
});

export let listBoards = SlateTool.create(spec, {
  name: 'List Boards',
  key: 'list_boards',
  description: `List all boards (dashboards) in the LogDNA account. Boards are visual dashboards composed of graphs and widgets for monitoring log data.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      boards: z.array(boardOutputSchema).describe('List of boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    let boards = await client.listBoards();
    let boardList = boards;

    return {
      output: {
        boards: boardList.map(b => ({
          boardId: b.boardID,
          title: b.title,
          widgets: b.widgets,
          account: b.account,
          category: b.category
        }))
      },
      message: `Found **${boardList.length}** board(s).`
    };
  })
  .build();

export let getBoard = SlateTool.create(spec, {
  name: 'Get Board',
  key: 'get_board',
  description: `Retrieve the configuration of a specific board by its ID, including its title and widgets.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to retrieve')
    })
  )
  .output(boardOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    let b = await client.getBoard(ctx.input.boardId);

    return {
      output: {
        boardId: b.boardID,
        title: b.title,
        widgets: b.widgets,
        account: b.account,
        category: b.category
      },
      message: `Retrieved board **${b.title || ctx.input.boardId}**.`
    };
  })
  .build();

export let createBoard = SlateTool.create(spec, {
  name: 'Create Board',
  key: 'create_board',
  description: `Create an empty board (dashboard) with a title and optional categories. Configure graphs in the provider dashboard; widgets are not supported by the current create endpoint.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      title: z.string().describe('Title for the new board'),
      account: z
        .string()
        .optional()
        .describe(
          'Optional account number when required; discover it on an existing board with list_boards'
        ),
      category: z
        .array(z.string())
        .optional()
        .describe(
          'Category IDs. Call list_categories with type boards to discover categories.'
        ),
      widgets: z
        .array(widgetSchema)
        .optional()
        .describe(
          'Legacy option not accepted by the current create API; configure graphs in the dashboard instead'
        )
    })
  )
  .output(boardOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    let b = await client.createBoard({
      title: ctx.input.title,
      account: ctx.input.account,
      category: ctx.input.category,
      widgets: ctx.input.widgets
    });

    return {
      output: {
        boardId: b.boardID,
        title: b.title,
        widgets: b.widgets,
        account: b.account,
        category: b.category
      },
      message: `Created board **${b.title || ctx.input.title}**.`
    };
  })
  .build();

export let deleteBoard = SlateTool.create(spec, {
  name: 'Delete Board',
  key: 'delete_board',
  description: `Delete a board (dashboard) by its ID.`,
  tags: { destructive: true, readOnly: false }
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
    let client = new Client({
      serviceKey: ctx.auth.token,
      authType: ctx.auth.authType,
      apiEndpoint: ctx.auth.apiEndpoint
    });
    await client.deleteBoard(ctx.input.boardId);

    return {
      output: { deleted: true },
      message: `Deleted board **${ctx.input.boardId}**.`
    };
  })
  .build();
