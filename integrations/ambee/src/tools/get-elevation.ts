import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let elevationRecordSchema = z
  .object({
    geometry: z
      .object({
        type: z.string().optional(),
        coordinates: z.array(z.number()).optional()
      })
      .passthrough()
      .optional()
      .describe('GeoJSON geometry'),
    elevationMin: z.number().optional().describe('Minimum elevation (meters)'),
    elevationMax: z.number().optional().describe('Maximum elevation (meters)'),
    elevationMean: z.number().optional().describe('Mean elevation (meters)')
  })
  .passthrough();

export let getElevation = SlateTool.create(spec, {
  name: 'Get Elevation',
  key: 'get_elevation',
  description: `Retrieve altitude and elevation data for a location including min, max, and mean elevation values. Supports lookup by coordinates or place name. Useful for navigation, disaster prediction, and infrastructure planning.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().min(-90).max(90).optional().describe('Latitude (-90 to 90)'),
      lng: z.number().min(-180).max(180).optional().describe('Longitude (-180 to 180)'),
      place: z.string().optional().describe('Place name to query')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        elevationRecords: z.array(elevationRecordSchema).describe('Elevation data records')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result: any;

    if (ctx.input.place) {
      result = await client.getElevationByPlace(ctx.input.place);
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.getElevationByLatLng(ctx.input.lat, ctx.input.lng);
    } else {
      throw new Error('Provide lat/lng coordinates or a place name.');
    }

    let elevationRecords = result.data || [];

    let summary =
      elevationRecords.length > 0
        ? `Elevation — Mean: **${elevationRecords[0].elevationMean}m**, Min: **${elevationRecords[0].elevationMin}m**, Max: **${elevationRecords[0].elevationMax}m**.`
        : 'No elevation data available for the specified location.';

    return {
      output: {
        message: result.message,
        elevationRecords
      },
      message: summary
    };
  })
  .build();
