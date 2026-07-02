import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let savedSearchSchema = z.object({
  searchId: z.number().describe('Unique saved search ID'),
  name: z.string().describe('Name of the saved search'),
  query: z.string().describe('Search query string'),
  groupId: z.number().nullable().describe('ID of the group this search is scoped to'),
  groupName: z.string().nullable().describe('Name of the group this search is scoped to')
});

export let listSavedSearches = SlateTool.create(spec, {
  name: 'List Saved Searches',
  key: 'list_saved_searches',
  description: `List all saved searches in Papertrail. Saved searches are named queries associated with a group that serve as the basis for setting up alerts.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      savedSearches: z.array(savedSearchSchema).describe('Array of saved searches')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listSavedSearches();

    let savedSearches = (Array.isArray(data) ? data : []).map((s: any) => ({
      searchId: s.id,
      name: s.name || '',
      query: s.query || '',
      groupId: s.group?.id ?? null,
      groupName: s.group?.name ?? null
    }));

    return {
      output: { savedSearches },
      message: `Found **${savedSearches.length}** saved search(es).`
    };
  })
  .build();

export let createSavedSearch = SlateTool.create(spec, {
  name: 'Create Saved Search',
  key: 'create_saved_search',
  description: `Create a new saved search within a group. Saved searches can be used to set up alerts that notify you when matching log events occur. The query uses Papertrail's search syntax (Boolean operators, quoted phrases, attribute filters).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe('Name for the saved search (e.g., "Slow queries", "Error logs")'),
      query: z.string().describe('Search query string using Papertrail search syntax'),
      groupId: z.number().optional().describe('ID of the group to scope this search to')
    })
  )
  .output(savedSearchSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let s = await client.createSavedSearch({
      name: ctx.input.name,
      query: ctx.input.query,
      groupId: ctx.input.groupId
    });

    return {
      output: {
        searchId: s.id,
        name: s.name || '',
        query: s.query || '',
        groupId: s.group?.id ?? null,
        groupName: s.group?.name ?? null
      },
      message: `Created saved search **${s.name}** (ID: ${s.id}) with query: \`${s.query}\`.`
    };
  })
  .build();

export let updateSavedSearch = SlateTool.create(spec, {
  name: 'Update Saved Search',
  key: 'update_saved_search',
  description: `Update an existing saved search's name, query, or group scope.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      searchId: z.number().describe('ID of the saved search to update'),
      name: z.string().optional().describe('New name for the search'),
      query: z.string().optional().describe('New search query string'),
      groupId: z.number().optional().describe('New group ID to scope this search to')
    })
  )
  .output(savedSearchSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let s = await client.updateSavedSearch(ctx.input.searchId, {
      name: ctx.input.name,
      query: ctx.input.query,
      groupId: ctx.input.groupId
    });

    return {
      output: {
        searchId: s.id,
        name: s.name || '',
        query: s.query || '',
        groupId: s.group?.id ?? null,
        groupName: s.group?.name ?? null
      },
      message: `Updated saved search **${s.name}** (ID: ${s.id}).`
    };
  })
  .build();

export let deleteSavedSearch = SlateTool.create(spec, {
  name: 'Delete Saved Search',
  key: 'delete_saved_search',
  description: `Delete a saved search and any associated alerts. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      searchId: z.number().describe('ID of the saved search to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSavedSearch(ctx.input.searchId);

    return {
      output: { deleted: true },
      message: `Deleted saved search with ID **${ctx.input.searchId}**.`
    };
  })
  .build();
