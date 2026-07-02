import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCatalogObject = SlateTool.create(spec, {
  name: 'Get Catalog Object',
  key: 'get_catalog_object',
  description: `Retrieve a specific catalog object by its ID. Returns full object data including related objects (e.g., item variations, modifier lists) when requested.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      catalogObjectId: z.string().describe('The ID of the catalog object to retrieve'),
      includeRelatedObjects: z
        .boolean()
        .optional()
        .describe('Include related objects like item variations')
    })
  )
  .output(
    z.object({
      catalogObjectId: z.string().optional(),
      type: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      isDeleted: z.boolean().optional(),
      version: z.number().optional(),
      updatedAt: z.string().optional(),
      presentAtAllLocations: z.boolean().optional(),
      rawObject: z.record(z.string(), z.any()).optional(),
      relatedObjects: z.array(z.record(z.string(), z.any())).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.getCatalogObject(
      ctx.input.catalogObjectId,
      ctx.input.includeRelatedObjects
    );
    let o = result.object;

    let name =
      o.item_data?.name ||
      o.category_data?.name ||
      o.tax_data?.name ||
      o.discount_data?.name ||
      o.modifier_list_data?.name ||
      o.item_variation_data?.name;

    return {
      output: {
        catalogObjectId: o.id,
        type: o.type,
        name,
        description: o.item_data?.description,
        isDeleted: o.is_deleted,
        version: o.version,
        updatedAt: o.updated_at,
        presentAtAllLocations: o.present_at_all_locations,
        rawObject: o,
        relatedObjects: result.relatedObjects
      },
      message: `Catalog object **${o.id}** — Type: **${o.type}**, Name: ${name || 'N/A'}`
    };
  })
  .build();
