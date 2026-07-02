import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { requireAtLeastOneTrelloField, requireTrelloString } from '../lib/errors';
import { spec } from '../spec';

let checkItemSchema = z.object({
  checkItemId: z.string().describe('Check item ID'),
  name: z.string().describe('Check item name'),
  state: z.string().describe('State: "complete" or "incomplete"'),
  position: z.number().optional().describe('Position within the checklist')
});

let checklistSchema = z.object({
  checklistId: z.string().describe('Checklist ID'),
  name: z.string().describe('Checklist name'),
  cardId: z.string().optional().describe('Card ID'),
  checkItems: z.array(checkItemSchema).optional().describe('Items in the checklist')
});

export let manageChecklist = SlateTool.create(spec, {
  name: 'Manage Checklist',
  key: 'manage_checklist',
  description: `Create, delete checklists on cards, and add, update, or remove checklist items. Also retrieves all checklists with their items for a given card.`,
  instructions: [
    'Use action "get" with a cardId to retrieve all checklists and their items.',
    'Use action "create_checklist" with cardId and name to create a new checklist.',
    'Use action "delete_checklist" with checklistId to delete a checklist.',
    'Use action "add_item" with checklistId and itemName to add a check item.',
    'Use action "update_item" with cardId and checkItemId to update an item (name, state).',
    'Use action "delete_item" with checklistId and checkItemId to remove an item.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'get',
          'create_checklist',
          'delete_checklist',
          'add_item',
          'update_item',
          'delete_item'
        ])
        .describe('Action to perform'),
      cardId: z
        .string()
        .optional()
        .describe('Card ID (required for get, create_checklist, update_item)'),
      checklistId: z
        .string()
        .optional()
        .describe('Checklist ID (required for delete_checklist, add_item, delete_item)'),
      checkItemId: z
        .string()
        .optional()
        .describe('Check item ID (required for update_item, delete_item)'),
      name: z
        .string()
        .optional()
        .describe('Name for the checklist (create_checklist) or check item (add_item)'),
      itemName: z.string().optional().describe('Name for a new check item (add_item)'),
      state: z
        .enum(['complete', 'incomplete'])
        .optional()
        .describe('Check item state (update_item)'),
      position: z.string().optional().describe('Position: "top", "bottom", or a number')
    })
  )
  .output(
    z.object({
      checklists: z
        .array(checklistSchema)
        .optional()
        .describe('Checklists with items (for get action)'),
      checklist: checklistSchema.optional().describe('Created or modified checklist'),
      checkItem: checkItemSchema.optional().describe('Created or modified check item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'get') {
      let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);
      let rawChecklists = await client.getChecklists(cardId);
      let checklists = rawChecklists.map((cl: any) => ({
        checklistId: cl.id,
        name: cl.name,
        cardId: cl.idCard,
        checkItems: cl.checkItems?.map((ci: any) => ({
          checkItemId: ci.id,
          name: ci.name,
          state: ci.state,
          position: ci.pos
        }))
      }));

      return {
        output: { checklists },
        message: `Found **${checklists.length}** checklist(s).`
      };
    }

    if (action === 'create_checklist') {
      let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);
      let name = requireTrelloString(ctx.input.name, 'name', action);
      let cl = await client.createChecklist(cardId, name, ctx.input.position);
      return {
        output: {
          checklist: {
            checklistId: cl.id,
            name: cl.name,
            cardId: cl.idCard
          }
        },
        message: `Created checklist **${cl.name}**.`
      };
    }

    if (action === 'delete_checklist') {
      let checklistId = requireTrelloString(ctx.input.checklistId, 'checklistId', action);
      await client.deleteChecklist(checklistId);
      return {
        output: {},
        message: `Deleted checklist \`${checklistId}\`.`
      };
    }

    if (action === 'add_item') {
      let checklistId = requireTrelloString(ctx.input.checklistId, 'checklistId', action);
      let itemName = requireTrelloString(
        ctx.input.itemName || ctx.input.name,
        'itemName',
        action
      );
      let item = await client.addCheckItem(
        checklistId,
        itemName,
        undefined,
        ctx.input.position
      );
      return {
        output: {
          checkItem: {
            checkItemId: item.id,
            name: item.name,
            state: item.state,
            position: item.pos
          }
        },
        message: `Added check item **${item.name}**.`
      };
    }

    if (action === 'update_item') {
      let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);
      let checkItemId = requireTrelloString(ctx.input.checkItemId, 'checkItemId', action);
      requireAtLeastOneTrelloField(
        {
          name: ctx.input.name,
          state: ctx.input.state,
          position: ctx.input.position
        },
        'check item field to update',
        action
      );

      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.state !== undefined) updateData.state = ctx.input.state;
      if (ctx.input.position !== undefined) updateData.pos = ctx.input.position;

      let item = await client.updateCheckItem(cardId, checkItemId, updateData);
      return {
        output: {
          checkItem: {
            checkItemId: item.id,
            name: item.name,
            state: item.state,
            position: item.pos
          }
        },
        message: `Updated check item **${item.name}** to **${item.state}**.`
      };
    }

    // delete_item
    let checklistId = requireTrelloString(ctx.input.checklistId, 'checklistId', action);
    let checkItemId = requireTrelloString(ctx.input.checkItemId, 'checkItemId', action);
    await client.deleteCheckItem(checklistId, checkItemId);
    return {
      output: {},
      message: `Deleted check item \`${checkItemId}\`.`
    };
  })
  .build();
