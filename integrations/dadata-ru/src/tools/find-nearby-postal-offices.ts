import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { readSuggestions } from '../lib/response';
import { spec } from '../spec';

export let findNearbyPostalOffices = SlateTool.create(spec, {
  name: 'Find Nearby Postal Offices',
  key: 'find_nearby_postal_offices',
  description:
    'Find Russian Post offices near geographic coordinates. Returns postal codes, addresses, closure status, coordinates, and the full office details including opening hours.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      latitude: z.number().min(-90).max(90).describe('Latitude in decimal degrees'),
      longitude: z.number().min(-180).max(180).describe('Longitude in decimal degrees'),
      radiusMeters: z.number().positive().optional().describe('Search radius in meters'),
      count: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum number of offices (default 10)')
    })
  )
  .output(
    z.object({
      offices: z.array(
        z.object({
          value: z.string().optional().describe('Office display value'),
          address: z.string().nullable(),
          postalCode: z.string().nullable(),
          isClosed: z.boolean().nullable().describe('Whether the office is closed'),
          latitude: z.union([z.string(), z.number()]).nullable(),
          longitude: z.union([z.string(), z.number()]).nullable(),
          details: z
            .record(z.string(), z.unknown())
            .nullable()
            .describe('Unmodified office fields, including opening hours')
        })
      ),
      rawData: z.unknown().optional().describe('Complete unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient(ctx.auth);
    let data = await client.geolocatePostalUnit({
      lat: ctx.input.latitude,
      lon: ctx.input.longitude,
      radiusMeters: ctx.input.radiusMeters,
      count: ctx.input.count
    });
    let offices = readSuggestions(data).map(s => ({
      value: s.value ?? undefined,
      address: s.data?.address_str ?? s.unrestricted_value ?? null,
      postalCode: s.data?.postal_code ?? null,
      isClosed: s.data?.is_closed ?? null,
      latitude: s.data?.geo_lat ?? null,
      longitude: s.data?.geo_lon ?? null,
      details: s.data ?? null
    }));
    return {
      output: { offices, rawData: data },
      message: `Found ${offices.length} nearby postal office(s).`
    };
  })
  .build();
