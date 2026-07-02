import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findLocations = SlateTool.create(spec, {
  name: 'Find Locations',
  key: 'find_locations',
  description: `Queries store locations from your StoreRocket account. Returns location data including addresses, phone numbers, operating hours, and custom fields.
Supports filtering by geographic proximity using latitude/longitude coordinates and radius, or by a search query such as a city name, zip code, or address.`,
  instructions: [
    'To search by proximity, provide lat and lng coordinates along with an optional radius.',
    'To search by address or place name, use the query parameter.',
    'Use limit and offset for paginating through large result sets.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query such as a city name, zip code, or address'),
      lat: z.number().optional().describe('Latitude for geographic proximity search'),
      lng: z.number().optional().describe('Longitude for geographic proximity search'),
      radius: z
        .number()
        .positive()
        .optional()
        .describe(
          'Search radius for proximity filtering (in miles or kilometers depending on account settings)'
        ),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of locations to return'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of locations to skip for pagination')
    })
  )
  .output(
    z.object({
      locations: z
        .any()
        .describe(
          'List of store locations with addresses, phone numbers, operating hours, and custom fields'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLocations({
      query: ctx.input.query,
      lat: ctx.input.lat,
      lng: ctx.input.lng,
      radius: ctx.input.radius,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        locations: result
      },
      message: `Successfully retrieved store locations from StoreRocket.`
    };
  })
  .build();
