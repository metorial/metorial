import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

export let reverseGeocode = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Convert geographic coordinates (latitude/longitude) into a human-readable address. Returns the closest address or area information for the given location.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the position to reverse geocode'),
      longitude: z.number().describe('Longitude of the position to reverse geocode'),
      types: z
        .string()
        .optional()
        .describe('Comma-separated result types to filter: "address", "street", "area"'),
      limit: z.number().optional().describe('Maximum number of results (default 1)'),
      lang: z.string().optional().describe('BCP 47 language code (e.g. "en-US")')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            title: z.string().optional().describe('Result title/label'),
            hereId: z.string().optional().describe('HERE place ID'),
            resultType: z.string().optional().describe('Result type'),
            address: z
              .object({
                label: z.string().optional(),
                countryCode: z.string().optional(),
                countryName: z.string().optional(),
                stateCode: z.string().optional(),
                state: z.string().optional(),
                county: z.string().optional(),
                city: z.string().optional(),
                district: z.string().optional(),
                street: z.string().optional(),
                postalCode: z.string().optional(),
                houseNumber: z.string().optional()
              })
              .optional()
              .describe('Structured address'),
            position: z
              .object({
                lat: z.number(),
                lng: z.number()
              })
              .optional()
              .describe('Coordinates of the result'),
            distance: z.number().optional().describe('Distance from query point in meters')
          })
        )
        .describe('Reverse geocoding results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response = await client.reverseGeocode({
      at: `${ctx.input.latitude},${ctx.input.longitude}`,
      types: ctx.input.types,
      limit: ctx.input.limit,
      lang: ctx.input.lang
    });

    let items = response.items || [];
    let results = items.map((item: any) => ({
      title: item.title,
      hereId: item.id,
      resultType: item.resultType,
      address: item.address,
      position: item.position,
      distance: item.distance
    }));

    return {
      output: { results },
      message:
        results.length > 0
          ? `Found **${results.length}** result(s) near (${ctx.input.latitude}, ${ctx.input.longitude}). Nearest: **${results[0].title}**`
          : `No address found near (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();
