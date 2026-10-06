import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  entity,
  id,
  optionalNumber,
  optionalText,
  row,
  rows,
  text
} from '../lib/client';
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
    destructive: true
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
            leadsCount: z.number().nullable().describe('Number of leads in the list'),
            type: z
              .string()
              .optional()
              .describe('Static or dynamic list; save leads only to static lists'),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('List of leads lists (for "list" action)'),
      list: z
        .object({
          listId: z.number().describe('List ID'),
          name: z.string().describe('List name'),
          leadsCount: z.number().nullable().describe('Number of leads in the list'),
          type: z
            .string()
            .optional()
            .describe('Static or dynamic list; save leads only to static lists'),
          createdAt: z.string().optional()
        })
        .optional()
        .describe('Single list (for get, create, update actions)'),
      pending: z
        .boolean()
        .optional()
        .describe(
          'Deletion was accepted for background processing; independently confirm absence before treating cleanup as complete'
        ),
      total: z.number().optional().describe('Provider-reported total list count'),
      returnedCount: z.number().optional(),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the list was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const map = (value: unknown) => {
      const list = entity(value);
      return {
        listId: id(list.id),
        name: text(list.name, 'list name'),
        leadsCount: optionalNumber(list.leads_count) ?? null,
        type: optionalText(list.type),
        createdAt: optionalText(list.created_at)
      };
    };
    if (ctx.input.action === 'list') {
      const result = await client.listLeadsLists({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      const lists = rows(row(result.data).leads_lists).map(map);
      return {
        output: {
          lists,
          total: optionalNumber(result.meta.total),
          returnedCount: lists.length
        },
        message: `Retrieved **${lists.length}** leads lists.`
      };
    }
    if (ctx.input.action === 'delete') {
      const result = await client.deleteLeadsList(id(ctx.input.listId));
      const pending = result.httpStatus === 202;
      return {
        output: { deleted: !pending, pending },
        message: pending
          ? 'Hunter accepted background list deletion. Confirm absence before considering cleanup complete.'
          : `Deleted leads list **${ctx.input.listId}**.`
      };
    }
    const result =
      ctx.input.action === 'get'
        ? await client.getLeadsList(id(ctx.input.listId))
        : ctx.input.action === 'create'
          ? await client.createLeadsList(text(ctx.input.name, 'list name'))
          : await client.updateLeadsList(
              id(ctx.input.listId),
              text(ctx.input.name, 'list name')
            );
    return {
      output: { list: map(result.data) },
      message: `Retrieved the ${ctx.input.action === 'get' ? 'requested' : 'saved'} leads list.`
    };
  })
  .build();
