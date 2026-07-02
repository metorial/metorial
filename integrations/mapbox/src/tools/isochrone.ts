import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let isochroneTool = SlateTool.create(spec, {
  name: 'Isochrone',
  key: 'isochrone',
  description: `Compute reachability areas (isochrones) from a location — areas that can be reached within a specified time or distance. Returns GeoJSON polygons or lines representing travel-time or travel-distance contours. Useful for service area analysis, delivery zones, and accessibility mapping.`,
  instructions: [
    'Provide either contoursMinutes or contoursMeters (not both).',
    'Contour values are comma-separated (e.g., "5,10,15" for 5, 10, and 15 minute isochrones).',
    'Set polygons to true to get filled area polygons instead of line contours.'
  ],
  constraints: [
    'Maximum 4 contour values per request.',
    'Time contours: 1-60 minutes each.',
    'Distance contours: 1-100,000 meters each.',
    'Rate limit: 300 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      longitude: z.number().describe('Origin longitude'),
      latitude: z.number().describe('Origin latitude'),
      profile: z
        .enum(['driving', 'driving-traffic', 'walking', 'cycling'])
        .default('driving')
        .describe('Travel profile'),
      contoursMinutes: z
        .string()
        .optional()
        .describe('Comma-separated travel time contours in minutes (e.g., "5,10,15")'),
      contoursMeters: z
        .string()
        .optional()
        .describe(
          'Comma-separated travel distance contours in meters (e.g., "1000,5000,10000")'
        ),
      polygons: z
        .boolean()
        .optional()
        .describe('Return filled polygons instead of line contours'),
      contoursColors: z
        .string()
        .optional()
        .describe('Comma-separated hex colors for contours (e.g., "ff0000,00ff00,0000ff")'),
      denoise: z.number().optional().describe('Noise reduction factor (0-1, default 1)'),
      generalize: z.number().optional().describe('Simplification tolerance in meters')
    })
  )
  .output(
    z.object({
      type: z.string().describe('GeoJSON type (FeatureCollection)'),
      features: z
        .array(
          z.object({
            type: z.string().optional(),
            geometry: z.any().optional().describe('GeoJSON geometry (Polygon or LineString)'),
            properties: z
              .object({
                contour: z.number().optional().describe('Contour value (minutes or meters)'),
                color: z.string().optional().describe('Contour color'),
                opacity: z.number().optional().describe('Contour opacity'),
                metric: z.string().optional().describe('Metric type (time or distance)')
              })
              .optional()
          })
        )
        .describe('Isochrone contour features')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    if (!ctx.input.contoursMinutes && !ctx.input.contoursMeters) {
      throw new Error('Either contoursMinutes or contoursMeters is required');
    }

    let result = await client.getIsochrone(
      ctx.input.profile,
      ctx.input.longitude,
      ctx.input.latitude,
      {
        contoursMinutes: ctx.input.contoursMinutes,
        contoursMeters: ctx.input.contoursMeters,
        contoursColors: ctx.input.contoursColors,
        polygons: ctx.input.polygons,
        denoise: ctx.input.denoise,
        generalize: ctx.input.generalize
      }
    );

    let featureCount = result.features?.length || 0;
    let metric = ctx.input.contoursMinutes ? 'time' : 'distance';

    return {
      output: {
        type: result.type,
        features: (result.features || []).map((f: any) => ({
          type: f.type,
          geometry: f.geometry,
          properties: f.properties
        }))
      },
      message: `Generated **${featureCount}** isochrone contour${featureCount !== 1 ? 's' : ''} by ${metric} using ${ctx.input.profile} profile.`
    };
  });
