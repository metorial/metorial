import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { locationOutputSchema, mapLocation } from './shared';

export let getLocation = SlateTool.create(spec, {
  name: 'Get Location',
  key: 'get_location',
  description:
    'Retrieve details for a single Square business location. Use "main" as the location ID to retrieve the main location.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      locationId: z.string().describe('The Square location ID to retrieve, or "main"')
    })
  )
  .output(locationOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let location = await client.getLocation(ctx.input.locationId);
    let output = mapLocation(location);

    return {
      output,
      message: `Location **${output.locationId}** — ${output.name || output.businessName || 'Unnamed location'}`
    };
  })
  .build();
