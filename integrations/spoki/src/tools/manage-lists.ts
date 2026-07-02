import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Lists',
  key: 'manage_lists',
  description: `Create, delete, or retrieve contact lists in Spoki. Lists are used to organize contacts into groups for campaigns and targeted automations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      name: z
        .string()
        .optional()
        .describe('Name for a new list (required when action is "create")'),
      listId: z
        .string()
        .optional()
        .describe('ID of the list to delete (required when action is "delete")')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.string().optional().describe('List ID'),
            name: z.string().optional().describe('List name')
          })
        )
        .optional()
        .describe('All lists (when action is "list")'),
      createdListId: z.string().optional().describe('ID of the newly created list'),
      deletedListId: z.string().optional().describe('ID of the deleted list'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      ctx.info('Fetching all lists');
      let result = await client.getLists();
      let items = Array.isArray(result) ? result : result?.results || result?.data || [];
      let lists = items.map((l: any) => ({
        listId: l.id ? String(l.id) : undefined,
        name: l.name
      }));

      return {
        output: { lists, raw: result },
        message: `Found **${lists.length}** lists`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('List name is required when creating a new list.');
      }
      ctx.info(`Creating list "${ctx.input.name}"`);
      let result = await client.createList(ctx.input.name);
      let createdId = result?.id ? String(result.id) : undefined;

      return {
        output: { createdListId: createdId, raw: result },
        message: `Created list **${ctx.input.name}**${createdId ? ` (ID: ${createdId})` : ''}`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.listId) {
        throw new Error('List ID is required when deleting a list.');
      }
      ctx.info(`Deleting list ${ctx.input.listId}`);
      let result = await client.deleteList(ctx.input.listId);

      return {
        output: { deletedListId: ctx.input.listId, raw: result },
        message: `Deleted list **${ctx.input.listId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
