import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient, filtersSchema } from '../lib/client';
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
    destructive: true,
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
    let client = new BugsnagClient(ctx.auth);

    if (ctx.input.action === 'list') {
      let projectId = ctx.input.projectId || ctx.config.projectId;
      if (!projectId) throw createApiServiceError('Project ID is required.');

      let searches = await client.listSavedSearches(projectId);
      let mapped = searches.map(s => ({
        searchId: s.id ?? undefined,
        name: s.name ?? undefined,
        searchFilters: s.filters ?? undefined,
        createdAt: s.created_at ?? undefined,
        updatedAt: s.updated_at ?? undefined
      }));

      return {
        output: { savedSearches: mapped },
        message: `Found **${mapped.length}** saved search(es).`
      };
    }

    if (ctx.input.action === 'create') {
      let projectId = ctx.input.projectId || ctx.config.projectId;
      if (!projectId) throw createApiServiceError('Project ID is required.');
      if (!ctx.input.name?.trim()) throw createApiServiceError('Name is required.');
      const parsed = filtersSchema.safeParse(ctx.input.searchFilters);
      if (!parsed.success)
        throw createApiServiceError(
          'Search filters must map event-field keys to arrays of comparisons containing type and string value.'
        );

      let result = await client.createSavedSearch(projectId, {
        name: ctx.input.name,
        filters: parsed.data,
        project_default: false
      });

      return {
        output: {
          savedSearch: {
            searchId: result.id ?? undefined,
            name: result.name ?? undefined,
            searchFilters: result.filters ?? undefined,
            createdAt: result.created_at ?? undefined
          }
        },
        message: `Created saved search **${result.name}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.searchId) throw createApiServiceError('Search ID is required.');

      let result = await client.getSavedSearch(ctx.input.searchId);

      return {
        output: {
          savedSearch: {
            searchId: result.id ?? undefined,
            name: result.name ?? undefined,
            searchFilters: result.filters ?? undefined,
            createdAt: result.created_at ?? undefined,
            updatedAt: result.updated_at ?? undefined
          }
        },
        message: `Retrieved saved search **${result.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.searchId) throw createApiServiceError('Search ID is required.');

      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) {
        if (!ctx.input.name.trim())
          throw createApiServiceError('Search name must not be blank.');
        updateData.name = ctx.input.name;
      }
      if (ctx.input.searchFilters !== undefined) {
        const parsed = filtersSchema.safeParse(ctx.input.searchFilters);
        if (!parsed.success)
          throw createApiServiceError(
            'Search filters must map event-field keys to arrays of comparisons containing type and string value.'
          );
        updateData.filters = parsed.data;
      }
      if (!Object.keys(updateData).length)
        throw createApiServiceError('Supply a search name or filters to update.');

      let result = await client.updateSavedSearch(ctx.input.searchId, updateData);

      return {
        output: {
          savedSearch: {
            searchId: result.id ?? undefined,
            name: result.name ?? undefined,
            searchFilters: result.filters ?? undefined,
            updatedAt: result.updated_at ?? undefined
          }
        },
        message: `Updated saved search **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.searchId) throw createApiServiceError('Search ID is required.');

      await client.deleteSavedSearch(ctx.input.searchId);

      return {
        output: { deleted: true },
        message: `Deleted saved search \`${ctx.input.searchId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
