import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';

export let getInventory = SlateTool.create(spec, {
  name: 'Get Inventory Counts',
  key: 'get_inventory',
  description: `Retrieve current inventory counts, optionally filtered by item variations, locations, tracked states, or update time. Use search_catalog for variation IDs and list_locations for location IDs.`,
  tags: { readOnly: true }
})
  .scopes(allOf('INVENTORY_READ'))
  .input(
    z.object({
      catalogObjectIds: z
        .array(z.string())
        .min(1)
        .max(1000)
        .optional()
        .describe(
          'Optional item variation IDs to filter counts (up to 1000). Use search_catalog to discover IDs'
        ),
      locationIds: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('Filter by location IDs; use list_locations to discover IDs'),
      states: z
        .array(z.string().min(1))
        .min(1)
        .optional()
        .describe(
          'Filter by tracked inventory states; Square ignores NONE, SOLD, and UNLINKED_RETURN'
        ),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only counts calculated after this RFC 3339 timestamp'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum counts per page (1-1000)'),
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
    requireSquareScopes(ctx.auth, ['INVENTORY_READ']);
    let ignoredStates = ctx.input.states?.filter(state =>
      ['NONE', 'SOLD', 'UNLINKED_RETURN'].includes(state)
    );
    if (ignoredStates?.length) {
      throw squareServiceError(
        `Square does not filter inventory counts by ${ignoredStates.join(', ')}. Use tracked states instead.`
      );
    }
    let client = createClient(ctx.auth);
    let result = await client.batchRetrieveInventoryCounts({
      catalogObjectIds: ctx.input.catalogObjectIds,
      locationIds: ctx.input.locationIds,
      states: ctx.input.states,
      updatedAfter: ctx.input.updatedAfter,
      limit: ctx.input.limit,
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
