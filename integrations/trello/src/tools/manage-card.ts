import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

export let manageCard = SlateTool.create(spec, {
  name: 'Manage Card',
  key: 'manage_card',
  description: `Create, update, move, or delete a Trello card. Supports setting name, description, due dates, member assignments, labels, and position. Cards can be moved between lists by updating the listId.`,
  instructions: [
    'To create a card, set action to "create" and provide listId and name.',
    'To update, set action to "update" with cardId and any fields to change.',
    'To move a card to another list, update it with a new listId.',
    'To delete, set action to "delete" with the cardId.',
    'Member and label IDs should be comma-separated strings when assigning multiple.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      cardId: z.string().optional().describe('Card ID (required for update and delete)'),
      listId: z
        .string()
        .optional()
        .describe(
          'List ID to place the card in (required for create, used for moving on update)'
        ),
      name: z.string().optional().describe('Card name (required for create)'),
      description: z.string().optional().describe('Card description (supports markdown)'),
      due: z
        .string()
        .optional()
        .describe(
          'Due date (ISO 8601 format, e.g. "2025-12-31T23:59:00.000Z"). Set to empty string to remove'
        ),
      start: z
        .string()
        .optional()
        .describe('Start date (ISO 8601 format). Set to empty string to remove'),
      dueComplete: z
        .boolean()
        .optional()
        .describe('Mark the due date as complete or incomplete'),
      closed: z.boolean().optional().describe('Set to true to archive, false to unarchive'),
      position: z
        .string()
        .optional()
        .describe('Position: "top", "bottom", or a positive number'),
      memberIds: z.string().optional().describe('Comma-separated member IDs to assign'),
      labelIds: z.string().optional().describe('Comma-separated label IDs to apply'),
      urlSource: z.string().optional().describe('URL to attach to the card (only for create)')
    })
  )
  .output(
    z.object({
      cardId: z.string().describe('Card ID'),
      name: z.string().optional().describe('Card name'),
      url: z.string().optional().describe('Card URL'),
      listId: z.string().optional().describe('List the card is in'),
      boardId: z.string().optional().describe('Board the card belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
    let { action, cardId } = ctx.input;

    if (action === 'create') {
      let card = await client.createCard({
        name: ctx.input.name!,
        idList: ctx.input.listId!,
        desc: ctx.input.description,
        pos: ctx.input.position,
        due: ctx.input.due,
        start: ctx.input.start,
        idMembers: ctx.input.memberIds,
        idLabels: ctx.input.labelIds,
        urlSource: ctx.input.urlSource
      });

      return {
        output: {
          cardId: card.id,
          name: card.name,
          url: card.url,
          listId: card.idList,
          boardId: card.idBoard
        },
        message: `Created card **${card.name}**.`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.description !== undefined) updateData.desc = ctx.input.description;
      if (ctx.input.listId !== undefined) updateData.idList = ctx.input.listId;
      if (ctx.input.due !== undefined) updateData.due = ctx.input.due || null;
      if (ctx.input.start !== undefined) updateData.start = ctx.input.start || null;
      if (ctx.input.dueComplete !== undefined) updateData.dueComplete = ctx.input.dueComplete;
      if (ctx.input.closed !== undefined) updateData.closed = ctx.input.closed;
      if (ctx.input.position !== undefined) updateData.pos = ctx.input.position;
      if (ctx.input.memberIds !== undefined) updateData.idMembers = ctx.input.memberIds;
      if (ctx.input.labelIds !== undefined) updateData.idLabels = ctx.input.labelIds;

      let card = await client.updateCard(cardId!, updateData);

      return {
        output: {
          cardId: card.id,
          name: card.name,
          url: card.url,
          listId: card.idList,
          boardId: card.idBoard
        },
        message: `Updated card **${card.name}**.`
      };
    }

    // delete
    await client.deleteCard(cardId!);
    return {
      output: {
        cardId: cardId!
      },
      message: `Deleted card \`${cardId}\`.`
    };
  })
  .build();
