import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLeadsList = SlateTool.create(spec, {
  name: 'Manage Leads List',
  key: 'manage_leads_list',
  description: `Create, update, or delete a leads list in Hunter. Lists are used to organize leads into groups. You can also list all existing leads lists or retrieve a specific list by ID.`,
  instructions: [
    'To **list all** lists, set action to "list".',
    'To **get** a specific list, set action to "get" and provide listId.',
    'To **create** a new list, set action to "create" and provide a name.',
    'To **update** a list name, set action to "update" and provide listId and name.',
    'To **delete** a list, set action to "delete" and provide listId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      listId: z.number().optional().describe('List ID (required for get, update, delete)'),
      name: z.string().optional().describe('List name (required for create and update)'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of lists to return (for list action, 1-100, default 20)'),
      offset: z.number().optional().describe('Offset for pagination (for list action)')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.number().describe('List ID'),
            name: z.string().describe('List name'),
            leadsCount: z.number().nullable().describe('Number of leads in the list')
          })
        )
        .optional()
        .describe('List of leads lists (for "list" action)'),
      list: z
        .object({
          listId: z.number().describe('List ID'),
          name: z.string().describe('List name'),
          leadsCount: z.number().nullable().describe('Number of leads in the list')
        })
        .optional()
        .describe('Single list (for get, create, update actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the list was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listLeadsLists({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let lists = (result.data?.leads_lists || []).map((l: any) => ({
        listId: l.id,
        name: l.name,
        leadsCount: l.leads_count ?? null
      }));
      return {
        output: { lists },
        message: `Retrieved **${lists.length}** leads lists.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.listId) throw new Error('listId is required for get action');
      let result = await client.getLeadsList(ctx.input.listId);
      let l = result.data;
      return {
        output: {
          list: { listId: l.id, name: l.name, leadsCount: l.leads_count ?? null }
        },
        message: `Retrieved list **${l.name}** (ID: ${l.id}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let result = await client.createLeadsList(ctx.input.name);
      let l = result.data;
      return {
        output: {
          list: { listId: l.id, name: l.name, leadsCount: l.leads_count ?? 0 }
        },
        message: `Created leads list **${l.name}** (ID: ${l.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.listId) throw new Error('listId is required for update action');
      if (!ctx.input.name) throw new Error('name is required for update action');
      let result = await client.updateLeadsList(ctx.input.listId, ctx.input.name);
      let l = result.data;
      return {
        output: {
          list: { listId: l.id, name: l.name, leadsCount: l.leads_count ?? null }
        },
        message: `Updated leads list to **${l.name}** (ID: ${l.id}).`
      };
    }

    // delete
    if (!ctx.input.listId) throw new Error('listId is required for delete action');
    await client.deleteLeadsList(ctx.input.listId);
    return {
      output: { deleted: true },
      message: `Deleted leads list **${ctx.input.listId}**.`
    };
  })
  .build();
