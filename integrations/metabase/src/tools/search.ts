import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let searchMetabase = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across all Metabase objects — questions, dashboards, collections, databases, and tables.
Optionally filter by object type, collection, or database. Returns matching items with their type and location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query string'),
      models: z
        .array(
          z.enum([
            'card',
            'dashboard',
            'collection',
            'database',
            'table',
            'dataset',
            'metric',
            'segment',
            'measure',
            'document',
            'action',
            'transform',
            'indexed-entity'
          ])
        )
        .optional()
        .describe('Filter by object types'),
      collectionId: z.number().optional().describe('Restrict search to a specific collection'),
      databaseId: z.number().optional().describe('Restrict search to a specific database'),
      archived: z.boolean().optional().describe('Search archived items'),
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .describe('Maximum results to return'),
      offset: z.number().int().min(0).optional().describe('Number of matching results to skip')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching results'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextOffset: z.number().optional().describe('Offset for the next page'),
      results: z.array(
        z.object({
          itemId: z.union([z.number(), z.string()]).describe('ID of the item'),
          name: z.string().describe('Name of the item'),
          model: z.string().describe('Type of item (card, dashboard, collection, etc.)'),
          description: z.string().nullable().describe('Description of the item'),
          collectionName: z
            .string()
            .nullable()
            .optional()
            .describe('Name of the containing collection')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient(ctx.auth);

    let result = await client.search({
      query: ctx.input.query,
      models: ctx.input.models,
      collectionId: ctx.input.collectionId,
      tableDatabaseId: ctx.input.databaseId,
      archived: ctx.input.archived,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let data = result.data || result;
    let items = (Array.isArray(data) ? data : []).map((item: any) => ({
      itemId: item.id,
      name: item.name,
      model: item.model,
      description: item.description ?? null,
      collectionName: item.collection?.name ?? null
    }));

    let total = result.total ?? items.length;
    let offset = ctx.input.offset ?? 0;
    let hasMore = offset + items.length < total;
    return {
      output: {
        total,
        hasMore,
        nextOffset: hasMore ? offset + items.length : undefined,
        results: items
      },
      message: `Found **${items.length}** result(s)${ctx.input.query ? ` for "${ctx.input.query}"` : ''}`
    };
  })
  .build();
