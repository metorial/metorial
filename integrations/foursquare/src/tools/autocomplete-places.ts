import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let autocompleteResultSchema = z.object({
  type: z.string().optional().describe('Result type: place, address, search, or geo'),
  text: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      highlight: z
        .array(
          z.object({
            start: z.number().optional(),
            length: z.number().optional()
          })
        )
        .optional()
    })
    .optional(),
  link: z.string().optional(),
  place: z
    .object({
      fsq_id: z.string().optional(),
      name: z.string().optional(),
      categories: z
        .array(
          z.object({
            fsq_id: z.string().optional(),
            name: z.string().optional(),
            icon: z
              .object({
                prefix: z.string().optional(),
                suffix: z.string().optional()
              })
              .optional()
          })
        )
        .optional(),
      location: z
        .object({
          address: z.string().optional(),
          formatted_address: z.string().optional(),
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
        .optional(),
      distance: z.number().optional()
    })
    .optional(),
  address: z
    .object({
      address_id: z.string().optional(),
      text: z.string().optional()
    })
    .optional()
    .describe('Address result details'),
  geo: z
    .object({
      name: z.string().optional(),
      center: z
        .object({
          latitude: z.number().optional(),
          longitude: z.number().optional()
        })
        .optional(),
      bounds: z
        .object({
          ne: z
            .object({ latitude: z.number().optional(), longitude: z.number().optional() })
            .optional(),
          sw: z
            .object({ latitude: z.number().optional(), longitude: z.number().optional() })
            .optional()
        })
        .optional()
    })
    .optional()
    .describe('Geographic area result details')
});

export let autocompletePlaces = SlateTool.create(spec, {
  name: 'Autocomplete Places',
  key: 'autocomplete_places',
  description: `Provides type-ahead search suggestions for places, addresses, and geographic areas. Returns a mix of result types as the user types, ideal for building search-as-you-type experiences.`,
  instructions: [
    'Use the types parameter to filter result types: "place", "address", "search", "geo", or comma-separated combinations.',
    'Provide ll (latitude,longitude) for location-biased results.',
    'Use session_token to group autocomplete requests for billing purposes.'
  ],
  constraints: ['Maximum 10 results per request.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Partial search text to autocomplete'),
      latitude: z.number().optional().describe('Latitude to bias results toward'),
      longitude: z.number().optional().describe('Longitude to bias results toward'),
      radius: z.number().optional().describe('Radius in meters for location bias'),
      types: z
        .string()
        .optional()
        .describe('Comma-separated result types to include: place, address, search, geo'),
      limit: z.number().optional().describe('Maximum number of results (1-10)'),
      sessionToken: z.string().optional().describe('Session token for grouping requests')
    })
  )
  .output(
    z.object({
      results: z.array(autocompleteResultSchema).describe('Autocomplete suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ll =
      ctx.input.latitude && ctx.input.longitude
        ? `${ctx.input.latitude},${ctx.input.longitude}`
        : undefined;

    let result = await client.autocomplete({
      query: ctx.input.query,
      ll,
      radius: ctx.input.radius,
      types: ctx.input.types,
      limit: ctx.input.limit,
      session_token: ctx.input.sessionToken
    });

    let results = result.results || [];

    return {
      output: { results },
      message: `Found **${results.length}** autocomplete suggestion(s) for "${ctx.input.query}".`
    };
  })
  .build();
