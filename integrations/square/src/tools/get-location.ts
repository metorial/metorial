import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireSquareScopes } from '../lib/helpers';
import { spec } from '../spec';
import { locationOutputSchema, mapLocation } from './shared';

export let getLocation = SlateTool.create(spec, {
  name: 'Get Location',
  key: 'get_location',
  description:
    'Retrieve a Square business location and its currency, status, and capabilities. Call list_locations to discover location IDs; use "main" for the main location.',
  tags: { readOnly: true }
})
  .scopes(allOf('MERCHANT_PROFILE_READ'))
  .input(
    z.object({
      locationId: z.string().describe('Square location ID from list_locations, or "main"')
    })
  )
  .output(locationOutputSchema)
  .handleInvocation(async ctx => {
    requireSquareScopes(ctx.auth, ['MERCHANT_PROFILE_READ']);
    let client = createClient(ctx.auth);
    let location = await client.getLocation(ctx.input.locationId);
    let output = mapLocation(location);

    return {
      output,
      message: `Location **${output.locationId}** — ${output.name || output.businessName || 'Unnamed location'}`
    };
  })
  .build();
