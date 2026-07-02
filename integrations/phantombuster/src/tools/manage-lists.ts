import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Lead Lists',
  key: 'manage_lists',
  description: `Manage lead lists in the LinkedIn Leads database. Fetch all lists, get a specific list, create/update a list, or delete a list.
- **fetchAll**: Get all lists in the workspace.
- **fetch**: Get a specific list by ID.
- **save**: Create or update a list.
- **delete**: Delete a list by ID.`
})
  .input(
    z.object({
      action: z
        .enum(['fetchAll', 'fetch', 'save', 'delete'])
        .describe('Action to perform on lists'),
      listId: z
        .string()
        .optional()
        .describe('ID of the list (required for "fetch", "save" with update, and "delete")'),
      name: z.string().optional().describe('Name for the list (used with "save" action)'),
      listMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata for the list (used with "save" action)')
    })
  )
  .output(
    z.object({
      lists: z.array(z.record(z.string(), z.any())).optional().describe('Retrieved lists'),
      list: z.record(z.string(), z.any()).optional().describe('Single list details'),
      deleted: z.boolean().optional().describe('Whether the delete was successful'),
      actionPerformed: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'fetchAll') {
      let lists = await client.fetchAllLists();
      return {
        output: {
          lists: Array.isArray(lists) ? lists : [],
          actionPerformed: 'fetchAll'
        },
        message: `Found **${Array.isArray(lists) ? lists.length : 0}** list(s).`
      };
    }

    if (ctx.input.action === 'fetch') {
      if (!ctx.input.listId) {
        throw new Error('listId is required for the "fetch" action');
      }
      let list = await client.fetchList(ctx.input.listId);
      return {
        output: {
          list,
          actionPerformed: 'fetch'
        },
        message: `Retrieved list **${ctx.input.listId}**.`
      };
    }

    if (ctx.input.action === 'save') {
      let body: Record<string, any> = {};
      if (ctx.input.listId) body.id = ctx.input.listId;
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.listMetadata) Object.assign(body, ctx.input.listMetadata);

      let result = await client.saveList(body);
      return {
        output: {
          list: result,
          actionPerformed: 'save'
        },
        message: ctx.input.listId
          ? `Updated list **${ctx.input.listId}**.`
          : `Created new list${ctx.input.name ? ` **${ctx.input.name}**` : ''}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.listId) {
        throw new Error('listId is required for the "delete" action');
      }
      await client.deleteList(ctx.input.listId);
      return {
        output: {
          deleted: true,
          actionPerformed: 'delete'
        },
        message: `Deleted list **${ctx.input.listId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
