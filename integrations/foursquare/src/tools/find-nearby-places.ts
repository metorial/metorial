import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findNearbyPlaces = SlateTool.create(spec, {
  name: 'Find Nearby Places',
  key: 'find_nearby_places',
  description: `Find places closest to a specific geographic coordinate. Unlike search, this endpoint focuses on immediate proximity and is designed for identifying what's around a precise location. Ideal for "what's near me" use cases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the location'),
      longitude: z.number().describe('Longitude of the location'),
      hacc: z.number().optional().describe('Horizontal accuracy of the location in meters'),
      altitude: z.number().optional().describe('Altitude in meters'),
      limit: z.number().optional().describe('Maximum number of results (default 10)'),
      fields: z.string().optional().describe('Comma-separated list of response fields')
    })
  )
  .output(
    z.object({
      places: z
        .array(
          z.object({
            fsqId: z.string().optional().describe('Foursquare place ID'),
            name: z.string().optional().describe('Place name'),
            distance: z.number().optional().describe('Distance in meters'),
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
        )
        .describe('List of nearby places')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ll = `${ctx.input.latitude},${ctx.input.longitude}`;
    let result = await client.getNearbyPlaces(ll, {
      hacc: ctx.input.hacc,
      altitude: ctx.input.altitude,
      limit: ctx.input.limit,
      fields: ctx.input.fields
    });

    let places = (result.results || []).map((p: any) => ({
      fsqId: p.fsq_id,
      name: p.name,
      distance: p.distance,
      categories: p.categories?.map((c: any) => ({
        fsqId: c.fsq_id,
        name: c.name
      })),
      location: p.location
        ? {
            address: p.location.address,
            formattedAddress: p.location.formatted_address,
            locality: p.location.locality,
            region: p.location.region,
            country: p.location.country
          }
        : undefined,
      geocodes: p.geocodes
    }));

    return {
      output: { places },
      message: `Found **${places.length}** nearby place(s) at ${ctx.input.latitude}, ${ctx.input.longitude}.`
    };
  })
  .build();
