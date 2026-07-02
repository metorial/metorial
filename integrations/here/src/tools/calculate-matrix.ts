import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

let coordinateSchema = z.object({
  lat: z.number().describe('Latitude'),
  lng: z.number().describe('Longitude')
});

export let calculateMatrix = SlateTool.create(spec, {
  name: 'Calculate Route Matrix',
  key: 'calculate_matrix',
  description: `Compute a route summary matrix between multiple origins and destinations. Returns travel times and/or distances for every origin-destination pair.
Useful for logistics, fleet management, and finding the closest location among multiple options.`,
  instructions: [
    'Provide origins as an array of {lat, lng} objects.',
    'If destinations are omitted, the matrix is computed between all origins.',
    'Use matrixAttributes to specify what to calculate: "travelTimes", "distances", or both.'
  ],
  constraints: [
    'Synchronous mode supports a limited number of origins × destinations (typically up to 15×100 or 100×1).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      origins: z.array(coordinateSchema).describe('Array of origin coordinates'),
      destinations: z
        .array(coordinateSchema)
        .optional()
        .describe('Array of destination coordinates (defaults to origins if omitted)'),
      transportMode: z
        .enum(['car', 'truck', 'pedestrian', 'bicycle', 'scooter', 'taxi', 'bus'])
        .optional()
        .describe('Transport mode (default car)'),
      matrixAttributes: z
        .array(z.enum(['travelTimes', 'distances']))
        .optional()
        .describe('Attributes to compute: "travelTimes" and/or "distances"'),
      departureTime: z.string().optional().describe('Departure time in ISO 8601 format'),
      regionType: z
        .enum(['autoCircle', 'circle', 'boundingBox', 'polygon', 'world'])
        .optional()
        .describe('Region definition type (default autoCircle)'),
      regionMargin: z.number().optional().describe('Margin in meters for autoCircle region'),
      avoidFeatures: z.array(z.string()).optional().describe('Road features to avoid')
    })
  )
  .output(
    z.object({
      matrixId: z.string().optional().describe('Matrix computation identifier'),
      numOrigins: z.number().describe('Number of origin points'),
      numDestinations: z.number().describe('Number of destination points'),
      travelTimes: z
        .array(z.number().nullable())
        .optional()
        .describe(
          'Flat array of travel times in seconds (row-major: origins × destinations). Null means no route found.'
        ),
      distances: z
        .array(z.number().nullable())
        .optional()
        .describe(
          'Flat array of distances in meters (row-major: origins × destinations). Null means no route found.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response = await client.calculateMatrix({
      origins: ctx.input.origins,
      destinations: ctx.input.destinations,
      transportMode: ctx.input.transportMode,
      matrixAttributes: ctx.input.matrixAttributes || ['travelTimes', 'distances'],
      departureTime: ctx.input.departureTime,
      regionType: ctx.input.regionType,
      regionMargin: ctx.input.regionMargin,
      avoidFeatures: ctx.input.avoidFeatures
    });

    let matrix = response.matrix || {};
    let numOrigins = ctx.input.origins.length;
    let numDestinations = ctx.input.destinations?.length || numOrigins;

    return {
      output: {
        matrixId: response.matrixId,
        numOrigins,
        numDestinations,
        travelTimes: matrix.travelTimes,
        distances: matrix.distances
      },
      message: `Computed **${numOrigins}×${numDestinations}** route matrix (${numOrigins * numDestinations} pairs).`
    };
  })
  .build();
