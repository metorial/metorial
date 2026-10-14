import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let placeSchema = z.looseObject({
  name: z.string().describe('Place name'),
  position: z.number().optional(),
  data_id: z.string().optional().describe('Google internal place identifier'),
  place_id: z.string().nullish().describe('Google Places identifier when available'),
  google_maps_url: z.string().optional().describe('Google Maps link'),
  website: z.string().nullish(),
  domain: z.string().nullish(),
  address: z.string().nullish(),
  address_lines: z.array(z.string()).optional(),
  district: z.string().nullish(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  rating: z.number().nullish(),
  review_count: z.number().nullish(),
  review_url: z.string().nullish(),
  categories: z.array(z.string()).optional(),
  category_ids: z.array(z.string()).optional(),
  phone: z.string().nullish(),
  phone_e164: z.string().nullish(),
  timezone: z.string().nullish(),
  thumbnail: z.string().nullish(),
  opening_hours: z.record(z.string(), z.string()).nullish()
});

let outputSchema = z.object({
  places: z.array(placeSchema),
  resultCount: z.number().describe('Number of places returned'),
  parsedAt: z.string().optional().describe('Provider response timestamp')
});

export let mapsSearch = SlateTool.create(spec, {
  name: 'Maps Search',
  key: 'maps_search',
  description:
    'Search Google Maps for businesses and places. Returns stable place identifiers, Maps links, contact details, coordinates, categories, and opening hours when available.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Place or category and location, for example coffee shops in Chicago, IL'),
      num: z
        .number()
        .optional()
        .describe(
          'Number of places requested, a whole number between 1 and 200; defaults to 20'
        ),
      interfaceLanguage: z
        .string()
        .optional()
        .describe('Interface language code, for example en or es; defaults to en'),
      country: z
        .string()
        .length(2)
        .optional()
        .describe('Two-letter country code, for example us or de; defaults to us')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).mapsSearch({
      query: ctx.input.query,
      num: ctx.input.num,
      hl: ctx.input.interfaceLanguage,
      gl: ctx.input.country
    });
    let result = outputSchema.safeParse({
      places: data.places,
      resultCount: data.result_count ?? data.places.length,
      parsedAt: data.parsed_at ?? undefined
    });
    if (!result.success) {
      throw createApiServiceError('Serply returned invalid place details. Try again.', {
        reason: 'invalid_serply_response'
      });
    }
    return {
      output: result.data,
      message: `Found **${result.data.places.length}** places for "${ctx.input.query}".`
    };
  })
  .build();
