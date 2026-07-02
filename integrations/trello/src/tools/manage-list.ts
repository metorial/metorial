import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { requireAtLeastOneTrelloField, requireTrelloString } from '../lib/errors';
import { spec } from '../spec';

export let manageList = SlateTool.create(spec, {
  name: 'Manage List',
  key: 'manage_list',
  description: `Create, update, or archive a list on a Trello board. Lists represent columns on a board (e.g. "To Do", "Doing", "Done").`,
  instructions: [
    'To create a list, set action to "create" and provide boardId and name.',
    'To update, set action to "update" and provide listId plus fields to change.',
    'To archive or unarchive, set action to "update" with closed=true or closed=false.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      listId: z.string().optional().describe('List ID (required for update)'),
      boardId: z.string().optional().describe('Board ID (required for create)'),
      name: z.string().optional().describe('List name (required for create)'),
      closed: z.boolean().optional().describe('Set to true to archive, false to unarchive'),
      position: z
        .string()
        .optional()
        .describe('Position of the list: "top", "bottom", or a positive number')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('List ID'),
      name: z.string().describe('List name'),
      closed: z.boolean().describe('Whether the list is archived'),
      position: z.number().describe('Position of the list'),
      boardId: z.string().describe('Board ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let name = requireTrelloString(ctx.input.name, 'name', ctx.input.action);
      let boardId = requireTrelloString(ctx.input.boardId, 'boardId', ctx.input.action);
      let list = await client.createList({
        name,
        idBoard: boardId,
        pos: ctx.input.position
      });

      return {
        output: {
          listId: list.id,
          name: list.name,
          closed: list.closed ?? false,
          position: list.pos,
          boardId: list.idBoard
        },
        message: `Created list **${list.name}**.`
      };
    }

    let listId = requireTrelloString(ctx.input.listId, 'listId', ctx.input.action);
    requireAtLeastOneTrelloField(
      {
        name: ctx.input.name,
        closed: ctx.input.closed,
        position: ctx.input.position
      },
      'list field to update',
      ctx.input.action
    );

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.closed !== undefined) updateData.closed = ctx.input.closed;
    if (ctx.input.position !== undefined) updateData.pos = ctx.input.position;

    let list = await client.updateList(listId, updateData);

    return {
      output: {
        listId: list.id,
        name: list.name,
        closed: list.closed ?? false,
        position: list.pos,
        boardId: list.idBoard
      },
      message: `Updated list **${list.name}**.`
    };
  })
  .build();
