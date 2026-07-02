import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nearbyAddressSchema = z.object({
  canonicalAddress: z.string().describe('Canonical address string'),
  pxid: z.string().describe('Unique address identifier')
});

export let reverseGeocodeTool = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Convert GPS coordinates (longitude/latitude) to the nearest addresses. Returns nearby addresses ordered by distance from the provided coordinates. **Available for New Zealand only.**`,
  constraints: ['Only available for New Zealand addresses.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      longitude: z.string().describe('Longitude in WGS84 format (e.g., "174.776236")'),
      latitude: z.string().describe('Latitude in WGS84 format (e.g., "-41.286460")'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return (1-100, default 10)')
    })
  )
  .output(
    z.object({
      addresses: z.array(nearbyAddressSchema).describe('Nearby addresses ordered by distance'),
      success: z.boolean().describe('Whether the request was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      authMethod: ctx.auth.authMethod
    });

    let data = await client.nzReverseGeocode({
      longitude: ctx.input.longitude,
      latitude: ctx.input.latitude,
      max: ctx.input.maxResults
    });

    let addresses = (data.completions || []).map((c: any) => ({
      canonicalAddress: c.a,
      pxid: c.pxid
    }));

    return {
      output: {
        addresses,
        success: data.success ?? true
      },
      message: `Found **${addresses.length}** addresses near coordinates (${ctx.input.longitude}, ${ctx.input.latitude}).`
    };
  })
  .build();
