import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

let savedSearchSchema = z.object({
  searchId: z.string().describe('Saved search ID'),
  name: z.string().optional().describe('Name of the saved search'),
  searchFilters: z.any().optional().describe('Filter configuration'),
  createdAt: z.string().optional().describe('When the saved search was created'),
  updatedAt: z.string().optional().describe('When the saved search was last updated')
});

export let manageSavedSearches = SlateTool.create(spec, {
  name: 'Manage Saved Searches',
  key: 'manage_saved_searches',
  description: `List, create, update, or delete saved searches in a Bugsnag project. Saved searches store filter configurations for quick access to frequently used error views.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      projectId: z.string().optional().describe('Project ID (required for list and create)'),
      searchId: z
        .string()
        .optional()
        .describe('Saved search ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Search name (required for create, optional for update)'),
      searchFilters: z
        .any()
        .optional()
        .describe('Filter configuration object (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      savedSearches: z.array(savedSearchSchema).optional().describe('List of saved searches'),
      savedSearch: savedSearchSchema.optional().describe('Single saved search'),
      deleted: z.boolean().optional().describe('Whether the saved search was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let projectId = ctx.input.projectId || ctx.config.projectId;
      if (!projectId) throw new Error('Project ID is required.');

      let searches = await client.listSavedSearches(projectId);
      let mapped = searches.map((s: any) => ({
        searchId: s.id,
        name: s.name,
        searchFilters: s.search_filters,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));

      return {
        output: { savedSearches: mapped },
        message: `Found **${mapped.length}** saved search(es).`
      };
    }

    if (ctx.input.action === 'create') {
      let projectId = ctx.input.projectId || ctx.config.projectId;
      if (!projectId) throw new Error('Project ID is required.');
      if (!ctx.input.name) throw new Error('Name is required.');
      if (!ctx.input.searchFilters) throw new Error('Search filters are required.');

      let result = await client.createSavedSearch(projectId, {
        name: ctx.input.name,
        search_filters: ctx.input.searchFilters
      });

      return {
        output: {
          savedSearch: {
            searchId: result.id,
            name: result.name,
            searchFilters: result.search_filters,
            createdAt: result.created_at
          }
        },
        message: `Created saved search **${result.name}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.searchId) throw new Error('Search ID is required.');

      let result = await client.getSavedSearch(ctx.input.searchId);

      return {
        output: {
          savedSearch: {
            searchId: result.id,
            name: result.name,
            searchFilters: result.search_filters,
            createdAt: result.created_at,
            updatedAt: result.updated_at
          }
        },
        message: `Retrieved saved search **${result.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.searchId) throw new Error('Search ID is required.');

      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.searchFilters) updateData.search_filters = ctx.input.searchFilters;

      let result = await client.updateSavedSearch(ctx.input.searchId, updateData);

      return {
        output: {
          savedSearch: {
            searchId: result.id,
            name: result.name,
            searchFilters: result.search_filters,
            updatedAt: result.updated_at
          }
        },
        message: `Updated saved search **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.searchId) throw new Error('Search ID is required.');

      await client.deleteSavedSearch(ctx.input.searchId);

      return {
        output: { deleted: true },
        message: `Deleted saved search \`${ctx.input.searchId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
