import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getInventory = SlateTool.create(spec, {
  name: 'Get Inventory Counts',
  key: 'get_inventory',
  description: `Retrieve inventory counts for one or more catalog item variations. Can look up counts for a single item variation or batch retrieve counts for multiple items across locations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      catalogObjectIds: z
        .array(z.string())
        .describe('Catalog object IDs (item variations) to get inventory counts for'),
      locationIds: z.array(z.string()).optional().describe('Filter by specific location IDs'),
      states: z
        .array(
          z.enum([
            'IN_STOCK',
            'SOLD',
            'RETURNED_BY_CUSTOMER',
            'RESERVED_FOR_SALE',
            'ORDERED_FROM_VENDOR',
            'RECEIVED_FROM_VENDOR',
            'IN_TRANSIT_TO',
            'NONE',
            'WASTE',
            'UNLINKED_RETURN',
            'COMPOSED',
            'DECOMPOSED'
          ])
        )
        .optional()
        .describe('Filter by inventory state'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      counts: z.array(
        z.object({
          catalogObjectId: z.string().optional(),
          catalogObjectType: z.string().optional(),
          state: z.string().optional(),
          locationId: z.string().optional(),
          quantity: z.string().optional(),
          calculatedAt: z.string().optional()
        })
      ),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.batchRetrieveInventoryCounts({
      catalogObjectIds: ctx.input.catalogObjectIds,
      locationIds: ctx.input.locationIds,
      states: ctx.input.states,
      cursor: ctx.input.cursor
    });

    let counts = result.counts.map(c => ({
      catalogObjectId: c.catalog_object_id,
      catalogObjectType: c.catalog_object_type,
      state: c.state,
      locationId: c.location_id,
      quantity: c.quantity,
      calculatedAt: c.calculated_at
    }));

    return {
      output: { counts, cursor: result.cursor },
      message: `Retrieved **${counts.length}** inventory count(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
