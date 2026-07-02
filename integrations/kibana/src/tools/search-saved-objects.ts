import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchSavedObjects = SlateTool.create(spec, {
  name: 'Search Saved Objects',
  key: 'search_saved_objects',
  description: `Search and list Kibana saved objects such as dashboards, visualizations, maps, data views, Canvas workpads, and other saved objects.
Use this to find specific objects by type and search term, or to browse all objects of a given type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .describe(
          'Type of saved object to search for (e.g., "dashboard", "visualization", "map", "index-pattern", "canvas-workpad", "lens", "search")'
        ),
      search: z
        .string()
        .optional()
        .describe('Search query string to filter objects by name or other fields'),
      searchFields: z
        .array(z.string())
        .optional()
        .describe('Fields to search against (defaults to all searchable fields)'),
      page: z.number().optional().describe('Page number (1-based)'),
      perPage: z.number().optional().describe('Number of results per page (default 20)'),
      sortField: z.string().optional().describe('Field to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching objects'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page'),
      savedObjects: z
        .array(
          z.object({
            objectId: z.string().describe('Unique ID of the saved object'),
            type: z.string().describe('Type of the saved object'),
            title: z.string().optional().describe('Title/name of the saved object'),
            updatedAt: z.string().optional().describe('Last update timestamp'),
            references: z
              .array(
                z.object({
                  referenceId: z.string(),
                  name: z.string(),
                  type: z.string()
                })
              )
              .optional()
              .describe('References to other saved objects')
          })
        )
        .describe('List of saved objects matching the search criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.findSavedObjects({
      type: ctx.input.objectType,
      search: ctx.input.search,
      searchFields: ctx.input.searchFields,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder
    });

    let savedObjects = (result.saved_objects ?? []).map((obj: any) => ({
      objectId: obj.id,
      type: obj.type,
      title: obj.attributes?.title ?? obj.attributes?.name,
      updatedAt: obj.updated_at,
      references: obj.references?.map((ref: any) => ({
        referenceId: ref.id,
        name: ref.name,
        type: ref.type
      }))
    }));

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.per_page ?? 20,
        savedObjects
      },
      message: `Found **${result.total ?? 0}** saved objects of type \`${ctx.input.objectType}\`${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
