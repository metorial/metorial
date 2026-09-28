import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import { locationOutputSchema, mapLocation } from './shared';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `List Square business locations. Use locationId in payments, orders, invoices, inventory, subscriptions, and payout tools; check status and capabilities before choosing a location.`,
  tags: { readOnly: true }
})
  .scopes(allOf('MERCHANT_PROFILE_READ'))
  .input(z.object({}))
  .output(
    z.object({
      locations: z.array(locationOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['MERCHANT_PROFILE_READ']);
    let client = createClient(ctx.auth);
    let locations = await client.listLocations();

    let mapped = locations.map(mapLocation);

    return {
      output: { locations: mapped },
      message: `Found **${mapped.length}** location(s).`
    };
  })
  .build();
