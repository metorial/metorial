import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let geocodeResultSchema = z.any().describe('Geocoding result with location details');

export let geocode = SlateTool.create(spec, {
  name: 'Geocode',
  key: 'geocode',
  description: `Convert between place names and geographic coordinates. Forward geocoding converts a place name to coordinates; reverse geocoding converts coordinates to location details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      place: z.string().optional().describe('Place name for forward geocoding'),
      lat: z
        .number()
        .min(-90)
        .max(90)
        .optional()
        .describe('Latitude for reverse geocoding (-90 to 90)'),
      lng: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Longitude for reverse geocoding (-180 to 180)')
    })
  )
  .output(
    z
      .object({
        message: z.string().optional(),
        locations: z.array(geocodeResultSchema).describe('Geocoding results')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      language: ctx.config.language
    });

    let result: any;
    let direction: string;

    if (ctx.input.place) {
      result = await client.geocodeByPlace(ctx.input.place);
      direction = 'forward';
    } else if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      result = await client.reverseGeocodeByLatLng(ctx.input.lat, ctx.input.lng);
      direction = 'reverse';
    } else {
      throw new Error(
        'Provide a place name for forward geocoding, or lat/lng for reverse geocoding.'
      );
    }

    let locations = result.data || [];

    return {
      output: {
        message: result.message,
        locations
      },
      message: `Performed ${direction} geocoding. Found **${locations.length}** result(s).`
    };
  })
  .build();
