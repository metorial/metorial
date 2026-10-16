import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let listPlaces = SlateTool.create(spec, {
  name: 'List Places',
  key: 'list_places',
  description: `List places (physical locations) in your Uniqode account. Places serve as organizational containers for beacons, NFC tags, QR codes, and geofences. Each place can be associated with a Google Place ID and geographic coordinates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page number for current API pagination'),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of results per page for current API pagination'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID from list_organizations; overrides the configured default'),
      search: z.string().optional().describe('Search by place name'),
      ordering: z.string().optional().describe('Sort field. Prefix with "-" for descending.'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      totalCount: z.number().describe('Total number of places'),
      places: z
        .array(
          z.object({
            placeId: z.number().describe('Place ID'),
            name: z.string().describe('Place name'),
            googlePlaceId: z.string().optional().describe('Google Place ID'),
            latitude: z.number().optional().describe('Latitude'),
            longitude: z.number().optional().describe('Longitude'),
            address: z.string().optional().describe('Street address'),
            organizationId: z.number().optional().describe('Organization ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of places')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listPlaces({
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      organization: ctx.input.organizationId ?? ctx.config.organizationId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let places = result.results.map(p => ({
      placeId: p.id,
      name: p.name,
      googlePlaceId: typeof p.place_id === 'string' ? p.place_id : undefined,
      latitude: typeof p.latitude === 'number' ? p.latitude : undefined,
      longitude: typeof p.longitude === 'number' ? p.longitude : undefined,
      address: typeof p.address === 'string' ? p.address : undefined,
      organizationId: typeof p.organization === 'number' ? p.organization : undefined,
      createdAt: typeof p.created === 'string' ? p.created : undefined,
      updatedAt: typeof p.updated === 'string' ? p.updated : undefined
    }));

    return {
      output: {
        raw: result,
        totalCount: result.count,
        places
      },
      message: `Found **${result.count}** place(s). Showing ${places.length} result(s).`
    };
  })
  .build();
