import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let matchPlace = SlateTool.create(spec, {
  name: 'Match Place',
  key: 'match_place',
  description: `Match a place name and location to a Foursquare POI record. Useful for enriching in-house datasets with Foursquare data by matching against known place names and addresses or coordinates.`,
  instructions: [
    'Provide the place name and either an address (with city/state/country) or lat/long coordinates.',
    'More location detail improves match accuracy.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the place to match'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City name'),
      state: z.string().optional().describe('State or region'),
      postalCode: z.string().optional().describe('Postal/ZIP code'),
      countryCode: z.string().optional().describe('Two-letter country code (e.g. "US")'),
      latitude: z.number().optional().describe('Latitude of the place'),
      longitude: z.number().optional().describe('Longitude of the place'),
      fields: z
        .string()
        .optional()
        .describe('Comma-separated list of response fields to include')
    })
  )
  .output(
    z.object({
      matched: z.boolean().describe('Whether a match was found'),
      place: z
        .object({
          fsqId: z.string().optional().describe('Foursquare place ID'),
          name: z.string().optional().describe('Place name'),
          categories: z
            .array(
              z.object({
                fsqId: z.string().optional(),
                name: z.string().optional()
              })
            )
            .optional(),
          location: z
            .object({
              address: z.string().optional(),
              formattedAddress: z.string().optional(),
              locality: z.string().optional(),
              region: z.string().optional(),
              postcode: z.string().optional(),
              country: z.string().optional()
            })
            .optional(),
          geocodes: z
            .object({
              main: z
                .object({
                  latitude: z.number().optional(),
                  longitude: z.number().optional()
                })
                .optional()
            })
            .optional()
        })
        .optional()
        .describe('Matched place details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ll =
      ctx.input.latitude && ctx.input.longitude
        ? `${ctx.input.latitude},${ctx.input.longitude}`
        : undefined;

    let result = await client.matchPlace({
      name: ctx.input.name,
      address: ctx.input.address,
      city: ctx.input.city,
      state: ctx.input.state,
      postalCode: ctx.input.postalCode,
      cc: ctx.input.countryCode,
      ll,
      fields: ctx.input.fields
    });

    let place = result.place;
    let matched = !!place;

    let mappedPlace = place
      ? {
          fsqId: place.fsq_id,
          name: place.name,
          categories: place.categories?.map((c: any) => ({
            fsqId: c.fsq_id,
            name: c.name
          })),
          location: place.location
            ? {
                address: place.location.address,
                formattedAddress: place.location.formatted_address,
                locality: place.location.locality,
                region: place.location.region,
                postcode: place.location.postcode,
                country: place.location.country
              }
            : undefined,
          geocodes: place.geocodes
        }
      : undefined;

    return {
      output: { matched, place: mappedPlace },
      message: matched
        ? `Matched "${ctx.input.name}" to **${place.name}** (${place.fsq_id}).`
        : `No match found for "${ctx.input.name}".`
    };
  })
  .build();
