import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let calculateDistance = SlateTool.create(spec, {
  name: 'Calculate Distance',
  key: 'calculate_distance',
  description: `Calculates driving distance/time and straight-line distance from a single origin to one or more destinations. Accepts both addresses and coordinates as the origin.

Destinations are provided as an array of address strings or "latitude,longitude" strings. The origin is geocoded and distances are returned for each destination.`,
  constraints: ['Up to 100 destinations per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      originAddress: z
        .string()
        .optional()
        .describe(
          'Origin as a street address. Provide this OR originLatitude/originLongitude.'
        ),
      originLatitude: z
        .number()
        .optional()
        .describe(
          'Origin latitude. Use with originLongitude as an alternative to originAddress.'
        ),
      originLongitude: z
        .number()
        .optional()
        .describe(
          'Origin longitude. Use with originLatitude as an alternative to originAddress.'
        ),
      destinations: z
        .array(z.string())
        .describe('Array of destination addresses or "latitude,longitude" strings'),
      distanceMode: z
        .enum(['driving', 'straight-line'])
        .optional()
        .describe('Distance calculation mode. Defaults to "driving".'),
      distanceUnits: z
        .enum(['miles', 'km'])
        .optional()
        .describe('Distance units. Defaults to "miles".'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Data enrichment fields to append to origin geocoding results')
    })
  )
  .output(
    z.object({
      originFormattedAddress: z.string().optional().describe('Geocoded origin address'),
      originLocation: z
        .object({
          lat: z.number(),
          lng: z.number()
        })
        .optional()
        .describe('Origin coordinates'),
      distances: z
        .array(
          z.object({
            destinationQuery: z.string().describe('The destination as queried'),
            destinationFormattedAddress: z
              .string()
              .optional()
              .describe('Geocoded destination address'),
            destinationLocation: z
              .object({
                lat: z.number(),
                lng: z.number()
              })
              .optional()
              .describe('Destination coordinates'),
            distance: z
              .object({
                meters: z.number().optional(),
                miles: z.number().optional(),
                km: z.number().optional()
              })
              .optional()
              .describe('Distance measurements'),
            duration: z
              .object({
                seconds: z.number().optional(),
                minutes: z.number().optional()
              })
              .optional()
              .describe('Estimated travel duration')
          })
        )
        .describe('Distance results for each destination')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.geocodeWithDistance({
      address: ctx.input.originAddress,
      latitude: ctx.input.originLatitude,
      longitude: ctx.input.originLongitude,
      destinations: ctx.input.destinations,
      distanceMode: ctx.input.distanceMode,
      distanceUnits: ctx.input.distanceUnits,
      fields: ctx.input.fields
    });

    let topResult = response.results?.[0];
    let originFormatted = topResult?.formatted_address;
    let originLocation = topResult?.location;

    let distances = (ctx.input.destinations || []).map((dest: string, i: number) => {
      let distResult = topResult?._distances?.[i];
      return {
        destinationQuery: dest,
        destinationFormattedAddress: distResult?.destination?.formatted_address,
        destinationLocation: distResult?.destination?.location,
        distance: distResult?.distance,
        duration: distResult?.duration
      };
    });

    return {
      output: {
        originFormattedAddress: originFormatted,
        originLocation: originLocation,
        distances
      },
      message: `Calculated distances from **${originFormatted || ctx.input.originAddress || `${ctx.input.originLatitude}, ${ctx.input.originLongitude}`}** to **${ctx.input.destinations.length}** destination(s).`
    };
  })
  .build();
