import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleMapsClient } from '../lib/client';
import { spec } from '../spec';

let elevationPointSchema = z.object({
  latitude: z.number().describe('Latitude'),
  longitude: z.number().describe('Longitude'),
  elevationMeters: z.number().describe('Elevation in meters above sea level'),
  resolutionMeters: z
    .number()
    .optional()
    .describe(
      'Maximum distance between data points from which the elevation was interpolated, in meters'
    )
});

export let getElevationTool = SlateTool.create(spec, {
  name: 'Get Elevation',
  key: 'get_elevation',
  description: `Get elevation data for one or more locations on Earth, including the ocean floor. Supports discrete points or sampled paths. Useful for terrain analysis, hiking routes, and elevation profiles.`,
  instructions: [
    'Provide locations as coordinate pairs. For a path profile, also specify the number of samples.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locations: z
        .array(
          z.object({
            latitude: z.number().describe('Latitude'),
            longitude: z.number().describe('Longitude')
          })
        )
        .describe('Coordinate points to get elevation for'),
      samples: z
        .number()
        .optional()
        .describe(
          'If provided, treats locations as a path and samples this many evenly-spaced points along it'
        )
    })
  )
  .output(
    z.object({
      elevations: z.array(elevationPointSchema).describe('Elevation data for each point')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleMapsClient({ token: ctx.auth.token });
    let response: Record<string, unknown>;

    if (ctx.input.samples) {
      response = await client.getElevationAlongPath({
        path: ctx.input.locations,
        samples: ctx.input.samples
      });
    } else {
      response = await client.getElevation({
        locations: ctx.input.locations
      });
    }

    if (response.status !== 'OK') {
      throw new Error(`Elevation request failed: ${response.status}`);
    }

    let rawResults = (response.results as Record<string, unknown>[]) || [];

    let elevations = rawResults.map(r => {
      let location = r.location as { lat: number; lng: number };
      return {
        latitude: location.lat,
        longitude: location.lng,
        elevationMeters: r.elevation as number,
        resolutionMeters: r.resolution as number | undefined
      };
    });

    let elevationValues = elevations.map(e => e.elevationMeters);
    let min = Math.min(...elevationValues);
    let max = Math.max(...elevationValues);
    let message = `Retrieved elevation for **${elevations.length}** point(s). Range: **${min.toFixed(1)}m** to **${max.toFixed(1)}m**.`;

    return {
      output: { elevations },
      message
    };
  })
  .build();
