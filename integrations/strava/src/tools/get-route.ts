import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRoute = SlateTool.create(spec, {
  name: 'Get Route',
  key: 'get_route',
  description: `Retrieve details about a route, optionally including its streams (lat/lng, distance, altitude) or an export in GPX or TCX format.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      routeId: z.number().describe('The route identifier'),
      includeStreams: z
        .boolean()
        .optional()
        .describe('Include route streams (latlng, distance, altitude)'),
      exportFormat: z
        .enum(['gpx', 'tcx'])
        .optional()
        .describe('Export route in GPX or TCX format')
    })
  )
  .output(
    z.object({
      routeId: z.number().describe('Route identifier'),
      name: z.string().describe('Route name'),
      description: z.string().nullable().optional().describe('Route description'),
      distance: z.number().describe('Route distance in meters'),
      elevationGain: z.number().describe('Total elevation gain in meters'),
      type: z.number().optional().describe('Route type (1=ride, 2=run)'),
      subType: z.number().optional().describe('Route sub-type'),
      starred: z.boolean().optional().describe('Whether the route is starred'),
      timestamp: z.number().optional().describe('Route creation timestamp'),
      streams: z.array(z.any()).optional().describe('Route streams data'),
      exportedFile: z.string().optional().describe('Exported route file content (GPX or TCX)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let route = await client.getRoute(ctx.input.routeId);

    let streams: any[] | undefined;
    let exportedFile: string | undefined;

    if (ctx.input.includeStreams) {
      streams = await client.getRouteStreams(ctx.input.routeId);
    }

    if (ctx.input.exportFormat === 'gpx') {
      exportedFile = await client.exportRouteGpx(ctx.input.routeId);
    } else if (ctx.input.exportFormat === 'tcx') {
      exportedFile = await client.exportRouteTcx(ctx.input.routeId);
    }

    return {
      output: {
        routeId: route.id,
        name: route.name,
        description: route.description,
        distance: route.distance,
        elevationGain: route.elevation_gain,
        type: route.type,
        subType: route.sub_type,
        starred: route.starred,
        timestamp: route.timestamp,
        streams,
        exportedFile
      },
      message: `Retrieved route **${route.name}** — ${(route.distance / 1000).toFixed(2)} km, ${route.elevation_gain} m gain.${ctx.input.exportFormat ? ` Exported as ${ctx.input.exportFormat.toUpperCase()}.` : ''}`
    };
  })
  .build();
