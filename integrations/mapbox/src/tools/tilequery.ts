import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

export let tilequeryTool = SlateTool.create(spec, {
  name: 'Tilequery',
  key: 'tilequery',
  description: `Query features from vector or raster tilesets at a specific geographic location. Retrieves data about map features near a given coordinate, useful for spatial lookups (e.g., "what's at this point?", "what features are within 500m?").`,
  instructions: [
    'Provide a tilesetId in the format "username.tilesetname" (e.g., "mapbox.mapbox-terrain-v2").',
    'Use radius to search for features within a distance (in meters) from the point.',
    'Use layers to filter results to specific tileset layers.'
  ],
  constraints: ['Rate limit: 600 requests per minute.', 'Maximum 50 results per query.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tilesetId: z
        .string()
        .describe(
          'Tileset ID in "username.tilesetname" format (e.g., "mapbox.mapbox-terrain-v2")'
        ),
      longitude: z.number().describe('Query longitude'),
      latitude: z.number().describe('Query latitude'),
      radius: z.number().optional().describe('Search radius in meters (default 0)'),
      limit: z.number().optional().describe('Maximum results to return (1-50, default 5)'),
      layers: z.string().optional().describe('Comma-separated layer names to filter'),
      dedupe: z.boolean().optional().describe('Remove duplicate features (default true)'),
      geometry: z
        .string()
        .optional()
        .describe('Filter by geometry type: point, linestring, polygon')
    })
  )
  .output(
    z.object({
      type: z.string().describe('GeoJSON type (FeatureCollection)'),
      features: z
        .array(
          z.object({
            type: z.string().optional(),
            geometry: z.any().optional().describe('Feature geometry'),
            properties: z
              .record(z.string(), z.any())
              .optional()
              .describe('Feature properties including tilequery metadata')
          })
        )
        .describe('Features found at or near the queried location')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let result = await client.tilequery(
      ctx.input.tilesetId,
      ctx.input.longitude,
      ctx.input.latitude,
      {
        radius: ctx.input.radius,
        limit: ctx.input.limit,
        layers: ctx.input.layers,
        dedupe: ctx.input.dedupe,
        geometry: ctx.input.geometry
      }
    );

    let featureCount = result.features?.length || 0;

    return {
      output: {
        type: result.type,
        features: (result.features || []).map((f: any) => ({
          type: f.type,
          geometry: f.geometry,
          properties: f.properties
        }))
      },
      message: `Found **${featureCount}** feature${featureCount !== 1 ? 's' : ''} in tileset **${ctx.input.tilesetId}** near [${ctx.input.longitude}, ${ctx.input.latitude}].`
    };
  });
