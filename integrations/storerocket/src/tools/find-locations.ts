import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findLocations = SlateTool.create(spec, {
  name: 'Find Locations',
  key: 'find_locations',
  description: `Retains the original StoreRocket /api/v2/locations call and its geographic, search, and pagination inputs for compatibility. This route is not documented in the current API reference. Use list_projects and list_project_locations for supported V2 location listing.`,
  instructions: [
    'The documented legacy V1 endpoint is /api/locations and uses a separate legacy token; this tool retains its original V2 route and is not a V1 client. Its availability and filtering remain unverified.',
    'For the documented location-list workflow, call list_projects and pass a project ID to list_project_locations.'
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
