import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient, organizationIdSchema } from '../lib/helpers';

export const listLocations = SlateTool.create(spec, {
  key: 'inventory_list_locations',
  name: 'List Inventory Locations',
  description:
    'Discover branches and warehouse locations in an Inventory organization. Call inventory_list_organizations first to choose an organization; use the location IDs for stock transfers.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      organizationId: organizationIdSchema
    })
  )
  .output(
    z.object({
      locations: z.array(
        z.object({
          locationId: z.string(),
          name: z.string(),
          status: z.string().optional(),
          isPrimary: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).listLocations();
    const locations = (result.locations ?? []).map((location: any) => ({
      locationId: String(location.location_id),
      name: location.location_name ?? location.name,
      status: location.status,
      isPrimary: location.is_primary
    }));
    return {
      output: { locations },
      message: `Found ${locations.length} Inventory locations.`
    };
  })
  .build();
