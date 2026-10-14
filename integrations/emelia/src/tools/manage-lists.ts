import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Contact Lists',
  key: 'manage_lists',
  description:
    'Discover contact lists and their IDs, create, retrieve, rename or delete a list, or read one page of list contacts. Deleting a list permanently deletes its contacts and linked lists and resynchronizes campaigns that use it.',
  instructions: [
    'Use action list to discover list IDs before configuring campaign recipients.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'get', 'rename', 'delete', 'contacts']),
      listId: z
        .string()
        .optional()
        .describe(
          'List ID from manage_lists action list; required for get, rename, delete and contacts'
        ),
      name: z.string().optional().describe('List name; required for create and rename'),
      page: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(1)
        .describe('One-based page for list or contacts'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('Number of lists or contacts per page'),
      search: z
        .string()
        .max(200)
        .optional()
        .describe('Search lists by name or contacts by text')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      result: z
        .record(z.string(), z.unknown())
        .describe(
          'List details, lifecycle result, or paginated items with total and page metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let { action, listId, name } = ctx.input;
    if (!['list', 'create'].includes(action) && !listId) {
      throw createApiServiceError(
        'List ID is required. Call manage_lists with action list to discover IDs.'
      );
    }
    if (['create', 'rename'].includes(action) && !name?.trim()) {
      throw createApiServiceError('A nonempty list name is required.');
    }
    let client = new EmeliaClient(ctx.auth.token);
    let data = await client.manageList(action, {
      ...ctx.input,
      listId: action === 'list' || action === 'create' ? undefined : listId,
      name: name?.trim()
    });
    let result = Array.isArray(data) ? { items: data } : data;
    return {
      output: { success: true, result },
      message: `Completed contact list operation **${action}**.`
    };
  })
  .build();
