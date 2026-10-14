import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let calculateDistance = SlateTool.create(spec, {
  name: 'Calculate Distance',
  key: 'calculate_distance',
  description: `Calculates driving distance/time and straight-line distance from a single origin to one or more destinations. Accepts both addresses and coordinates as the origin.

Destinations are provided as an array of address strings or "latitude,longitude" strings. The origin is geocoded and distances are returned for each destination.`,
  constraints: [
    'Up to 100 destinations per request.',
    'Requires Distance API access enabled on the API key.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      originAddress: z
        .string()
        .trim()
        .optional()
        .describe(
          'Origin as a street address. Provide this OR originLatitude/originLongitude.'
        ),
      originLatitude: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe(
          'Origin latitude. Use with originLongitude as an alternative to originAddress.'
        ),
      originLongitude: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe(
          'Origin longitude. Use with originLatitude as an alternative to originAddress.'
        ),
      destinations: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(100)
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
    let hasAddress = Boolean(ctx.input.originAddress?.trim());
    let hasLatitude = ctx.input.originLatitude !== undefined;
    let hasLongitude = ctx.input.originLongitude !== undefined;
    if (hasAddress ? hasLatitude || hasLongitude : !hasLatitude || !hasLongitude) {
      throw createApiServiceError(
        'Provide either originAddress or both originLatitude and originLongitude, not both.'
      );
    }
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
    if (!topResult) {
      throw createApiServiceError(
        'No matching origin was found. Use a more specific address or coordinates.'
      );
    }
    let originFormatted = topResult?.formatted_address;
    let originLocation = topResult?.location;

    let distances = (topResult.destinations || []).map((distResult: any) => {
      return {
        destinationQuery: distResult.query,
        destinationFormattedAddress:
          distResult.geocode?.formatted_address ?? distResult.formatted_address ?? undefined,
        destinationLocation: Array.isArray(distResult.location)
          ? { lat: distResult.location[0], lng: distResult.location[1] }
          : (distResult.location ?? undefined),
        distance: {
          miles: distResult.distance_miles ?? undefined,
          km: distResult.distance_km ?? undefined,
          meters:
            typeof distResult.distance_km === 'number'
              ? distResult.distance_km * 1000
              : undefined
        },
        duration:
          typeof distResult.duration_seconds === 'number'
            ? {
                seconds: distResult.duration_seconds,
                minutes: distResult.duration_seconds / 60
              }
            : undefined
      };
    });

    return {
      output: {
        originFormattedAddress: originFormatted,
        originLocation: originLocation,
        distances
      },
      message: `Calculated distances from **${originFormatted || ctx.input.originAddress || `${ctx.input.originLatitude}, ${ctx.input.originLongitude}`}** to **${distances.length}** destination(s).`
    };
  })
  .build();
