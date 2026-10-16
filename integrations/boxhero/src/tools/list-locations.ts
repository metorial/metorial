import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLocations = SlateTool.create(spec, {
  name: 'List Locations',
  key: 'list_locations',
  description: `Retrieve all inventory locations (warehouses, stores, stockrooms) from BoxHero. Use location IDs when filtering items or creating transactions.`,
  constraints: [
    'Requires a team in Location mode (mode = 2).',
    'Calling this in Basic or Unit mode returns an error.'
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
            name: z.string().describe('Location name'),
            quantity: z.number().optional().describe('Total on-hand stock across all items'),
            memo: z.string().optional().describe('Location memo')
          })
        )
        .describe('List of inventory locations'),
      raw: z.unknown().optional().describe('Original response returned by BoxHero')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listLocations();

    let locations = response.items.map(loc => ({
      locationId: loc.id,
      name: loc.name,
      quantity: loc.quantity,
      memo: loc.memo
    }));

    return {
      output: { locations, raw: response },
      message: `Retrieved ${locations.length} location(s).`
    };
  })
  .build();
