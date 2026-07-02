import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

export let manageBoard = SlateTool.create(spec, {
  name: 'Manage Board',
  key: 'manage_board',
  description: `Create, update, or delete a Trello board. Use to set up new boards, rename them, change descriptions, update preferences, or archive/delete boards.`,
  instructions: [
    'To create a board, set action to "create" and provide a name.',
    'To update, set action to "update" and provide the boardId plus fields to change.',
    'To delete, set action to "delete" and provide the boardId.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      boardId: z.string().optional().describe('Board ID (required for update and delete)'),
      name: z.string().optional().describe('Board name (required for create)'),
      description: z.string().optional().describe('Board description'),
      organizationId: z.string().optional().describe('Workspace ID for the board'),
      closed: z.boolean().optional().describe('Set to true to archive the board'),
      defaultLists: z
        .boolean()
        .optional()
        .describe(
          'Whether to create default lists (To Do, Doing, Done) on create. Defaults to true'
        ),
      permissionLevel: z
        .enum(['private', 'org', 'public'])
        .optional()
        .describe('Board permission level'),
      background: z
        .string()
        .optional()
        .describe('Board background color or image (e.g. "blue", "green", "red")')
    })
  )
  .output(
    z.object({
      boardId: z.string().describe('Board ID'),
      name: z.string().optional().describe('Board name'),
      description: z.string().optional().describe('Board description'),
      closed: z.boolean().optional().describe('Whether the board is archived'),
      url: z.string().optional().describe('Board URL'),
      organizationId: z.string().optional().describe('Workspace ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
    let { action, boardId } = ctx.input;

    if (action === 'create') {
      let board = await client.createBoard({
        name: ctx.input.name!,
        desc: ctx.input.description,
        idOrganization: ctx.input.organizationId,
        defaultLists: ctx.input.defaultLists,
        prefs_permissionLevel: ctx.input.permissionLevel,
        prefs_background: ctx.input.background
      });

      return {
        output: {
          boardId: board.id,
          name: board.name,
          description: board.desc || undefined,
          closed: board.closed,
          url: board.url,
          organizationId: board.idOrganization || undefined
        },
        message: `Created board **${board.name}**.`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.desc = ctx.input.description;
      if (ctx.input.closed !== undefined) updateData.closed = ctx.input.closed;
      if (ctx.input.organizationId !== undefined)
        updateData.idOrganization = ctx.input.organizationId;
      if (ctx.input.permissionLevel !== undefined)
        updateData['prefs/permissionLevel'] = ctx.input.permissionLevel;
      if (ctx.input.background !== undefined)
        updateData['prefs/background'] = ctx.input.background;

      let board = await client.updateBoard(boardId!, updateData);

      return {
        output: {
          boardId: board.id,
          name: board.name,
          description: board.desc || undefined,
          closed: board.closed,
          url: board.url,
          organizationId: board.idOrganization || undefined
        },
        message: `Updated board **${board.name}**.`
      };
    }

    // delete
    await client.deleteBoard(boardId!);
    return {
      output: {
        boardId: boardId!
      },
      message: `Deleted board \`${boardId}\`.`
    };
  })
  .build();
