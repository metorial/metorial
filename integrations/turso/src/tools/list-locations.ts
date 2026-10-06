import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `List all available deployment locations for database groups. Also identifies the closest location to the requester.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeClosest: z
        .boolean()
        .optional()
        .describe('Whether to also return the closest location to the requester')
    })
  )
  .output(
    z.object({
      locations: z
        .record(z.string(), z.string())
        .describe('Map of location codes to descriptive names'),
      closestLocation: z
        .string()
        .optional()
        .describe(
          'The region serving this API request; it reflects the request origin rather than your own device'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let result = await client.listLocations();
    let closestLocation: string | undefined;

    if (ctx.input.includeClosest) {
      let closest = await client.getClosestRegion();
      closestLocation = closest.server;
    }

    let locationCount = Object.keys(result.locations).length;

    return {
      output: {
        locations: result.locations,
        closestLocation
      },
      message: `Found **${locationCount}** available locations.${closestLocation ? ` Closest: **${closestLocation}**.` : ''}`
    };
  })
  .build();
