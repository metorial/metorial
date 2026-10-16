import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exactIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getRouteDetails = SlateTool.create(spec, {
  name: 'Get Route Details',
  key: 'get_route_details',
  description:
    'Retrieve a route and optionally its streams or prepare a downloadable GPX or TCX export. Private routes require read_all scope.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      routeId: exactIdSchema.describe(
        'Route identifier from list_routes. Use the exact decimal string id_str for IDs beyond 9007199254740991.'
      ),
      includeStreams: z
        .boolean()
        .optional()
        .describe('Include route coordinate, distance and altitude streams'),
      exportFormat: z
        .enum(['gpx', 'tcx'])
        .optional()
        .describe('Prepare a GPX or TCX route file for download')
    })
  )
  .output(
    z.object({
      routeId: z
        .number()
        .optional()
        .describe('Numeric route identifier; use routeIdString for the exact ID'),
      routeIdString: z
        .string()
        .optional()
        .describe('Exact route identifier from Strava id_str or the requested ID'),
      name: z.string().optional(),
      description: z.string().nullable().optional(),
      distance: z.number().optional(),
      elevationGain: z.number().optional(),
      streams: z.any().optional(),
      export: z
        .object({
          format: z.enum(['gpx', 'tcx']),
          filename: z.string(),
          mimeType: z.string(),
          downloadUrl: z.string()
        })
        .optional()
        .describe('Prepared export metadata; download requires the connected Strava account'),
      raw: z.any().describe('Complete route returned by Strava')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let requestedRouteId = String(ctx.input.routeId);
    let route = await client.getRouteDetails(requestedRouteId);
    let routeId = route.id_str ?? requestedRouteId;
    let streams = ctx.input.includeStreams
      ? await client.getRouteDetailsStreams(requestedRouteId)
      : undefined;
    let file:
      | {
          format: 'gpx' | 'tcx';
          filename: string;
          mimeType: string;
          downloadUrl: string;
        }
      | undefined;
    if (ctx.input.exportFormat) {
      let format = ctx.input.exportFormat;
      let downloadUrl = `https://www.strava.com/api/v3/routes/${encodeURIComponent(String(routeId))}/export_${format}`;
      let mimeType =
        format === 'gpx' ? 'application/gpx+xml' : 'application/vnd.garmin.tcx+xml';
      let filename = `route-${routeId}.${format}`;
      await ctx.addAttachment({
        type: 'url',
        url: downloadUrl,
        headers: { Authorization: `Bearer ${ctx.auth.token}` },
        mimeType,
        filename
      });
      file = { format, filename, mimeType, downloadUrl };
    }
    return {
      output: {
        routeId: route.id,
        routeIdString: routeId,
        name: route.name,
        description: route.description,
        distance: route.distance,
        elevationGain: route.elevation_gain,
        streams,
        export: file,
        raw: route
      },
      message: file
        ? `Retrieved route details and prepared a ${file.format.toUpperCase()} download.`
        : 'Retrieved route details.'
    };
  })
  .build();
