import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `List all physical locations configured in the account. Locations are used for tracking where gift cards are sold or redeemed.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      locations: z.array(
        z
          .object({
            locationId: z.string().describe('Location ID'),
            name: z.string().describe('Location name')
          })
          .passthrough()
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    let locations = await client.listLocations();

    let mapped = (Array.isArray(locations) ? locations : []).map((loc: any) => ({
      ...loc,
      locationId: loc.id
    }));

    return {
      output: { locations: mapped },
      message: `Found **${mapped.length}** locations`
    };
  })
  .build();
