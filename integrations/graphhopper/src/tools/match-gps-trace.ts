import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphHopperClient } from '../lib/client';
import { spec } from '../spec';

let matchedInstructionSchema = z.object({
  text: z.string().describe('Human-readable instruction text'),
  streetName: z.string().describe('Name of the street'),
  distance: z.number().describe('Distance for this segment in meters'),
  time: z.number().describe('Time for this segment in milliseconds'),
  sign: z.number().describe('Turn sign indicator')
});

let matchedPathSchema = z.object({
  distance: z.number().describe('Total matched distance in meters'),
  time: z.number().describe('Total matched travel time in milliseconds'),
  ascend: z.number().optional().describe('Total elevation gain in meters'),
  descend: z.number().optional().describe('Total elevation loss in meters'),
  bbox: z
    .array(z.number())
    .optional()
    .describe('Bounding box [minLon, minLat, maxLon, maxLat]'),
  points: z.unknown().describe('Matched route geometry as coordinate array'),
  instructions: z
    .array(matchedInstructionSchema)
    .optional()
    .describe('Turn-by-turn instructions along matched route')
});

export let matchGpsTrace = SlateTool.create(spec, {
  name: 'Match GPS Trace',
  key: 'match_gps_trace',
  description: `Snap measured GPS points to the road network (map matching). Takes a GPX file content and returns the matched route on the digital road network.
Useful for cleaning noisy GPS data, reconstructing traveled routes, or attaching road attributes (street names, elevation, speed limits) to GPS traces.`,
  instructions: [
    'Input must be valid GPX XML content with trackpoints.',
    'The GPX should contain a track with latitude/longitude coordinates.'
  ],
  constraints: [
    'Request size depends on your GraphHopper plan. Ensure the GPX does not exceed the location limit.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      gpxContent: z.string().describe('GPX XML content with GPS trackpoints to match'),
      profile: z
        .enum([
          'car',
          'car_delivery',
          'car_avoid_ferry',
          'car_avoid_motorway',
          'car_avoid_toll',
          'small_truck',
          'small_truck_delivery',
          'truck',
          'scooter',
          'scooter_delivery',
          'foot',
          'hike',
          'bike',
          'mtb',
          'racingbike'
        ])
        .default('car')
        .describe('Vehicle profile used for matching'),
      locale: z
        .string()
        .optional()
        .describe('Language for turn instructions (e.g., "en", "de")'),
      elevation: z.boolean().optional().describe('Include elevation data'),
      instructions: z.boolean().optional().describe('Include turn-by-turn instructions'),
      gpsAccuracy: z
        .number()
        .optional()
        .describe('GPS accuracy in meters (helps improve matching quality)')
    })
  )
  .output(
    z.object({
      paths: z.array(matchedPathSchema).describe('Matched route paths'),
      processingTimeMs: z
        .number()
        .optional()
        .describe('Server processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphHopperClient({ token: ctx.auth.token });

    let result = await client.matchRoute({
      gpxContent: ctx.input.gpxContent,
      profile: ctx.input.profile,
      locale: ctx.input.locale,
      elevation: ctx.input.elevation,
      instructions: ctx.input.instructions,
      pointsEncoded: false,
      gpsAccuracy: ctx.input.gpsAccuracy
    });

    let paths = ((result.paths || []) as Record<string, unknown>[]).map(p => ({
      distance: p.distance as number,
      time: p.time as number,
      ascend: p.ascend as number | undefined,
      descend: p.descend as number | undefined,
      bbox: p.bbox as number[] | undefined,
      points: p.points,
      instructions: p.instructions
        ? (p.instructions as Record<string, unknown>[]).map(inst => ({
            text: inst.text as string,
            streetName: inst.street_name as string,
            distance: inst.distance as number,
            time: inst.time as number,
            sign: inst.sign as number
          }))
        : undefined
    }));

    let primaryPath = paths[0];
    let distanceKm = primaryPath ? (primaryPath.distance / 1000).toFixed(1) : '0';
    let timeMin = primaryPath ? (primaryPath.time / 60000).toFixed(1) : '0';

    return {
      output: {
        paths,
        processingTimeMs: result.info?.took
      },
      message: `Matched GPS trace to road network. Matched route: **${distanceKm} km**, **${timeMin} min**.`
    };
  })
  .build();
