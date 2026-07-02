import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let manageLists = SlateTool.create(spec, {
  name: 'Manage Lists',
  key: 'manage_lists',
  description: `Create, update, delete, or retrieve lists in Klaviyo. Also supports adding and removing profiles from lists.
Lists are static collections of profiles used for campaign targeting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete', 'add_profiles', 'remove_profiles'])
        .describe('Action to perform on lists'),
      listId: z
        .string()
        .optional()
        .describe('List ID (required for get, update, delete, add_profiles, remove_profiles)'),
      name: z
        .string()
        .optional()
        .describe('List name (required for create, optional for update)'),
      profileIds: z
        .array(z.string())
        .optional()
        .describe('Profile IDs (for add_profiles/remove_profiles)'),
      filter: z
        .string()
        .optional()
        .describe('Filter string for listing, e.g. equals(name,"My List")'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      lists: z
        .array(
          z.object({
            listId: z.string().describe('List ID'),
            name: z.string().optional().describe('List name'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last updated timestamp')
          })
        )
        .optional()
        .describe('List of results (for list/get actions)'),
      listId: z.string().optional().describe('ID of the created/updated/targeted list'),
      success: z.boolean().describe('Whether the operation succeeded'),
      nextCursor: z.string().optional().describe('Pagination cursor for next page'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, listId, name, profileIds, filter, pageCursor, pageSize } = ctx.input;

    if (action === 'list') {
      let result = await client.getLists({ filter, pageCursor, pageSize });
      let lists = result.data.map(l => ({
        listId: l.id ?? '',
        name: l.attributes?.name ?? undefined,
        created: l.attributes?.created ?? undefined,
        updated: l.attributes?.updated ?? undefined
      }));
      let nextCursor = extractPaginationCursor(result.links);
      return {
        output: { lists, success: true, nextCursor, hasMore: !!nextCursor },
        message: `Retrieved **${lists.length}** lists`
      };
    }

    if (action === 'get') {
      if (!listId) throw klaviyoServiceError('listId is required');
      let result = await client.getList(listId);
      let l = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          lists: [
            {
              listId: l?.id ?? '',
              name: l?.attributes?.name,
              created: l?.attributes?.created,
              updated: l?.attributes?.updated
            }
          ],
          listId: l?.id,
          success: true
        },
        message: `Retrieved list **${l?.attributes?.name ?? listId}**`
      };
    }

    if (action === 'create') {
      if (!name) throw klaviyoServiceError('name is required for create');
      let result = await client.createList(name);
      let l = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { listId: l?.id, success: true },
        message: `Created list **${name}** (${l?.id})`
      };
    }

    if (action === 'update') {
      if (!listId) throw klaviyoServiceError('listId is required');
      if (!name) throw klaviyoServiceError('name is required for update');
      let result = await client.updateList(listId, name);
      let l = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { listId: l?.id, success: true },
        message: `Updated list **${listId}** to "${name}"`
      };
    }

    if (action === 'delete') {
      if (!listId) throw klaviyoServiceError('listId is required');
      await client.deleteList(listId);
      return {
        output: { listId, success: true },
        message: `Deleted list **${listId}**`
      };
    }

    if (action === 'add_profiles') {
      if (!listId) throw klaviyoServiceError('listId is required');
      if (!profileIds?.length) throw klaviyoServiceError('profileIds are required');
      await client.addProfilesToList(listId, profileIds);
      return {
        output: { listId, success: true },
        message: `Added **${profileIds.length}** profiles to list **${listId}**`
      };
    }

    if (action === 'remove_profiles') {
      if (!listId) throw klaviyoServiceError('listId is required');
      if (!profileIds?.length) throw klaviyoServiceError('profileIds are required');
      await client.removeProfilesFromList(listId, profileIds);
      return {
        output: { listId, success: true },
        message: `Removed **${profileIds.length}** profiles from list **${listId}**`
      };
    }

    throw klaviyoServiceError(`Unknown action: ${action}`);
  })
  .build();
