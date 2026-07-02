import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { requireAtLeastOneTrelloField, requireTrelloString } from '../lib/errors';
import { spec } from '../spec';

let labelSchema = z.object({
  labelId: z.string().describe('Label ID'),
  name: z.string().optional().describe('Label name'),
  color: z.string().optional().describe('Label color'),
  boardId: z.string().optional().describe('Board ID')
});

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `Get, create, update, or delete labels on a Trello board. Also assign or remove labels from cards.`,
  instructions: [
    'Use action "get" with boardId to list all labels on a board.',
    'Use action "create" with boardId, name, and color to create a new label.',
    'Use action "update" with labelId to rename or recolor a label.',
    'Use action "delete" with labelId to delete a label.',
    'Use action "assign" with cardId and labelId to add a label to a card.',
    'Use action "unassign" with cardId and labelId to remove a label from a card.',
    'Valid colors: green, yellow, orange, red, purple, blue, sky, lime, pink, black, null (no color).'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete', 'assign', 'unassign'])
        .describe('Action to perform'),
      boardId: z.string().optional().describe('Board ID (required for get, create)'),
      labelId: z
        .string()
        .optional()
        .describe('Label ID (required for update, delete, assign, unassign)'),
      cardId: z.string().optional().describe('Card ID (required for assign, unassign)'),
      name: z.string().optional().describe('Label name'),
      color: z
        .string()
        .optional()
        .describe(
          'Label color (green, yellow, orange, red, purple, blue, sky, lime, pink, black)'
        )
    })
  )
  .output(
    z.object({
      labels: z.array(labelSchema).optional().describe('List of labels (for get action)'),
      label: labelSchema.optional().describe('Created or updated label')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'get') {
      let boardId = requireTrelloString(ctx.input.boardId, 'boardId', action);
      let rawLabels = await client.getBoardLabels(boardId);
      let labels = rawLabels.map((l: any) => ({
        labelId: l.id,
        name: l.name || undefined,
        color: l.color || undefined,
        boardId: l.idBoard
      }));
      return {
        output: { labels },
        message: `Found **${labels.length}** label(s).`
      };
    }

    if (action === 'create') {
      let boardId = requireTrelloString(ctx.input.boardId, 'boardId', action);
      let name = requireTrelloString(ctx.input.name, 'name', action);
      let color = requireTrelloString(ctx.input.color, 'color', action);
      let label = await client.createLabel({
        name,
        color,
        idBoard: boardId
      });
      return {
        output: {
          label: {
            labelId: label.id,
            name: label.name,
            color: label.color,
            boardId: label.idBoard
          }
        },
        message: `Created label **${label.name}** (${label.color}).`
      };
    }

    if (action === 'update') {
      let labelId = requireTrelloString(ctx.input.labelId, 'labelId', action);
      requireAtLeastOneTrelloField(
        {
          name: ctx.input.name,
          color: ctx.input.color
        },
        'label field to update',
        action
      );

      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.color !== undefined) updateData.color = ctx.input.color;

      let label = await client.updateLabel(labelId, updateData);
      return {
        output: {
          label: {
            labelId: label.id,
            name: label.name,
            color: label.color,
            boardId: label.idBoard
          }
        },
        message: `Updated label **${label.name}**.`
      };
    }

    if (action === 'delete') {
      let labelId = requireTrelloString(ctx.input.labelId, 'labelId', action);
      await client.deleteLabel(labelId);
      return {
        output: {},
        message: `Deleted label \`${labelId}\`.`
      };
    }

    if (action === 'assign') {
      let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);
      let labelId = requireTrelloString(ctx.input.labelId, 'labelId', action);
      await client.addCardLabel(cardId, labelId);
      return {
        output: {},
        message: `Assigned label \`${labelId}\` to card \`${cardId}\`.`
      };
    }

    // unassign
    let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);
    let labelId = requireTrelloString(ctx.input.labelId, 'labelId', action);
    await client.removeCardLabel(cardId, labelId);
    return {
      output: {},
      message: `Removed label \`${labelId}\` from card \`${cardId}\`.`
    };
  })
  .build();
