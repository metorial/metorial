import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let listGeofences = SlateTool.create(spec, {
  name: 'List Geofences',
  key: 'list_geofences',
  description: `List and search geofences in your Beaconstac account. Returns geofence details including geographic coordinates, radius, associated campaigns, and places.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by geofence name'),
      ordering: z.string().optional().describe('Sort field. Prefix with "-" for descending.'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of geofences'),
      geofences: z
        .array(
          z.object({
            geofenceId: z.number().describe('Geofence ID'),
            name: z.string().describe('Geofence name'),
            latitude: z.number().describe('Latitude of center'),
            longitude: z.number().describe('Longitude of center'),
            radius: z.number().describe('Radius in meters'),
            placeId: z.number().optional().describe('Associated place ID'),
            campaignContentType: z.number().optional().describe('Campaign content type'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of geofences')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listGeofences({
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      organization: ctx.config.organizationId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let geofences = result.results.map(g => ({
      geofenceId: g.id,
      name: g.name,
      latitude: g.latitude,
      longitude: g.longitude,
      radius: g.radius,
      placeId: g.place,
      campaignContentType: g.campaign?.content_type,
      createdAt: g.created,
      updatedAt: g.updated
    }));

    return {
      output: {
        totalCount: result.count,
        geofences
      },
      message: `Found **${result.count}** geofence(s). Showing ${geofences.length} result(s).`
    };
  })
  .build();
