import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchCatalog = SlateTool.create(spec, {
  name: 'Search Catalog',
  key: 'search_catalog',
  description: `Search the Square catalog for items, variations, categories, taxes, discounts, and other catalog objects. Supports text search, category filtering, and object type filtering.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      textFilter: z
        .string()
        .optional()
        .describe('Text to search for in item names and descriptions'),
      objectTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Types of catalog objects to include, e.g., ITEM, ITEM_VARIATION, CATEGORY, TAX, DISCOUNT, MODIFIER_LIST'
        ),
      categoryIds: z.array(z.string()).optional().describe('Category IDs to filter items by'),
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe('Advanced search query object for catalog/search endpoint'),
      cursor: z.string().optional().describe('Pagination cursor from previous response'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      includeRelatedObjects: z
        .boolean()
        .optional()
        .describe('Include related objects (e.g., variations for items)')
    })
  )
  .output(
    z.object({
      objects: z.array(
        z.object({
          catalogObjectId: z.string().optional(),
          type: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          isDeleted: z.boolean().optional(),
          version: z.number().optional(),
          updatedAt: z.string().optional(),
          rawObject: z
            .record(z.string(), z.any())
            .optional()
            .describe('Full catalog object data')
        })
      ),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    // Use searchCatalogItems for text/category search, searchCatalogObjects for advanced queries
    if (ctx.input.textFilter || ctx.input.categoryIds) {
      let result = await client.searchCatalogItems({
        textFilter: ctx.input.textFilter,
        categoryIds: ctx.input.categoryIds,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      });

      let objects = result.items.map(o => ({
        catalogObjectId: o.id,
        type: o.type,
        name: o.item_data?.name || o.item_variation_data?.name,
        description: o.item_data?.description,
        isDeleted: o.is_deleted,
        version: o.version,
        updatedAt: o.updated_at,
        rawObject: o
      }));

      return {
        output: { objects, cursor: result.cursor },
        message: `Found **${objects.length}** catalog item(s).${result.cursor ? ' More results available.' : ''}`
      };
    }

    let result = await client.searchCatalogObjects({
      objectTypes: ctx.input.objectTypes,
      query: ctx.input.query,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      includeRelatedObjects: ctx.input.includeRelatedObjects
    });

    let objects = result.objects.map(o => {
      let name =
        o.item_data?.name ||
        o.category_data?.name ||
        o.tax_data?.name ||
        o.discount_data?.name ||
        o.modifier_list_data?.name ||
        o.item_variation_data?.name;

      return {
        catalogObjectId: o.id,
        type: o.type,
        name,
        description: o.item_data?.description,
        isDeleted: o.is_deleted,
        version: o.version,
        updatedAt: o.updated_at,
        rawObject: o
      };
    });

    return {
      output: { objects, cursor: result.cursor },
      message: `Found **${objects.length}** catalog object(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
