import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, requireSquareScopes } from '../lib/helpers';
import type { SquareCatalogObject } from '../lib/types';
import { spec } from '../spec';

let catalogObjectOutputSchema = z.object({
  catalogObjectId: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  isDeleted: z.boolean().optional(),
  version: z.number().optional(),
  updatedAt: z.string().optional(),
  rawObject: z.record(z.string(), z.any()).optional().describe('Full catalog object data')
});

let mapCatalogObject = (object: SquareCatalogObject) => ({
  catalogObjectId: object.id,
  type: object.type,
  name:
    object.item_data?.name ||
    object.category_data?.name ||
    object.tax_data?.name ||
    object.discount_data?.name ||
    object.modifier_list_data?.name ||
    object.item_variation_data?.name,
  description: object.item_data?.description,
  isDeleted: object.is_deleted,
  version: object.version,
  updatedAt: object.updated_at,
  rawObject: object
});

export let searchCatalog = SlateTool.create(spec, {
  name: 'Search Catalog',
  key: 'search_catalog',
  description:
    'Search Square catalog items by text or category, or search catalog objects by type and advanced query. Choose one search mode; item and object filters cannot be combined.',
  tags: { readOnly: true }
})
  .scopes(allOf('ITEMS_READ'))
  .input(
    z.object({
      mode: z
        .enum(['ITEMS', 'OBJECTS'])
        .optional()
        .describe(
          'ITEMS for text/category search; OBJECTS for object type or advanced query search. Inferred from filters when omitted'
        ),
      textFilter: z
        .string()
        .optional()
        .describe(
          'ITEMS mode: text in item names, descriptions, variation names, SKU, or UPC'
        ),
      categoryIds: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('ITEMS mode: category IDs to filter items by'),
      productTypes: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('ITEMS mode: item product types'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('ITEMS mode: item name order'),
      objectTypes: z
        .array(z.string())
        .min(1)
        .optional()
        .describe(
          'OBJECTS mode: Square catalog object types, including ITEM_VARIATION when variations are needed'
        ),
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe('OBJECTS mode: Square CatalogQuery object'),
      includeRelatedObjects: z
        .boolean()
        .optional()
        .describe('OBJECTS mode: return one level of related catalog objects'),
      includeDeletedObjects: z
        .boolean()
        .optional()
        .describe('OBJECTS mode: include deleted catalog objects'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response in the same mode'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum results per page: 1-100 for ITEMS, 1-1000 for OBJECTS')
    })
  )
  .output(
    z.object({
      objects: z.array(catalogObjectOutputSchema),
      relatedObjects: z.array(catalogObjectOutputSchema).optional(),
      matchedVariationIds: z.array(z.string()).optional(),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let hasItemFilters =
      input.textFilter !== undefined ||
      input.categoryIds !== undefined ||
      input.productTypes !== undefined ||
      input.sortOrder !== undefined;
    let hasObjectFilters =
      input.objectTypes !== undefined ||
      input.query !== undefined ||
      input.includeRelatedObjects !== undefined ||
      input.includeDeletedObjects !== undefined;
    let mode = input.mode || (hasItemFilters ? 'ITEMS' : 'OBJECTS');
    if (hasItemFilters && hasObjectFilters) {
      throw squareServiceError(
        'Item and object search filters cannot be combined. Make separate search_catalog calls.'
      );
    }
    if (mode === 'ITEMS' && hasObjectFilters) {
      throw squareServiceError('OBJECTS filters are not supported in ITEMS mode.');
    }
    if (mode === 'OBJECTS' && hasItemFilters) {
      throw squareServiceError(
        'Text, category, product type, and sort order filters require ITEMS mode.'
      );
    }
    requireSquareScopes(ctx.auth, ['ITEMS_READ']);
    let client = createClient(ctx.auth);
    if (mode === 'ITEMS') {
      if (input.limit !== undefined && input.limit > 100) {
        throw squareServiceError('ITEMS search limit must be between 1 and 100.');
      }
      let result = await client.searchCatalogItems({
        textFilter: input.textFilter,
        categoryIds: input.categoryIds,
        productTypes: input.productTypes,
        sortOrder: input.sortOrder,
        cursor: input.cursor,
        limit: input.limit
      });
      let objects = result.items.map(mapCatalogObject);
      return {
        output: {
          objects,
          matchedVariationIds: result.matchedVariationIds,
          cursor: result.cursor
        },
        message: `Found **${objects.length}** catalog item(s).${result.cursor ? ' More results available.' : ''}`
      };
    }
    let result = await client.searchCatalogObjects({
      objectTypes: input.objectTypes,
      query: input.query,
      cursor: input.cursor,
      limit: input.limit,
      includeRelatedObjects: input.includeRelatedObjects,
      includeDeletedObjects: input.includeDeletedObjects
    });
    let objects = result.objects.map(mapCatalogObject);
    return {
      output: {
        objects,
        relatedObjects: result.relatedObjects.map(mapCatalogObject),
        cursor: result.cursor
      },
      message: `Found **${objects.length}** catalog object(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
