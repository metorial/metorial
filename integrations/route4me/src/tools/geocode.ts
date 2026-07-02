import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let geocode = SlateTool.create(spec, {
  name: 'Geocode Address',
  key: 'geocode_address',
  description: `Convert a street address to geographic coordinates (forward geocoding) or convert lat/lng to a street address (reverse geocoding).
Provide either an address string for forward geocoding, or lat/lng for reverse geocoding.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address: z.string().optional().describe('Street address to geocode (forward geocoding)'),
      lat: z.number().optional().describe('Latitude for reverse geocoding'),
      lng: z.number().optional().describe('Longitude for reverse geocoding')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            address: z.string().optional().describe('Resolved street address'),
            lat: z.number().optional().describe('Latitude'),
            lng: z.number().optional().describe('Longitude'),
            confidence: z.string().optional().describe('Geocoding confidence level'),
            type: z.string().optional().describe('Result type')
          })
        )
        .describe('Geocoding results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.lat !== undefined && ctx.input.lng !== undefined) {
      let result = await client.reverseGeocode(ctx.input.lat, ctx.input.lng);
      let items = Array.isArray(result) ? result : [result];
      return {
        output: {
          results: items.map((r: any) => ({
            address: r.address || r.formatted_address,
            lat: r.lat || ctx.input.lat,
            lng: r.lng || ctx.input.lng,
            confidence: r.confidence,
            type: r.type || 'reverse'
          }))
        },
        message: `Reverse geocoded (${ctx.input.lat}, ${ctx.input.lng}): ${items.length} result(s).`
      };
    }

    if (ctx.input.address) {
      let result = await client.geocodeAddress(ctx.input.address);
      let items = Array.isArray(result) ? result : [result];
      return {
        output: {
          results: items.map((r: any) => ({
            address: r.address || ctx.input.address,
            lat: r.lat,
            lng: r.lng,
            confidence: r.confidence,
            type: r.type || 'forward'
          }))
        },
        message: `Geocoded "${ctx.input.address}": ${items.length} result(s).`
      };
    }

    return {
      output: { results: [] },
      message: 'No address or coordinates provided.'
    };
  })
  .build();
