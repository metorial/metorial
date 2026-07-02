import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Retrieve all inventory locations (warehouses, stores, stockrooms) from BoxHero. Use location IDs when filtering items or creating transactions.`,
  constraints: [
    'Only available for teams on the Business Plan (Business Mode).',
    'Calling this in Basic Mode will result in an error.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      locations: z
        .array(
          z.object({
            locationId: z.number().describe('Unique location ID'),
            name: z.string().describe('Location name')
          })
        )
        .describe('List of inventory locations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listLocations();

    let locations = response.items.map(loc => ({
      locationId: loc.id,
      name: loc.name
    }));

    return {
      output: { locations },
      message: `Retrieved ${locations.length} location(s).`
    };
  })
  .build();
