import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let reverseGeoResultSchema = z.object({
  value: z.string().describe('Formatted address'),
  unrestrictedValue: z.string().describe('Full address with postal code'),
  postalCode: z.string().nullable().describe('Postal code'),
  country: z.string().nullable().describe('Country'),
  region: z.string().nullable().describe('Region'),
  city: z.string().nullable().describe('City'),
  street: z.string().nullable().describe('Street'),
  house: z.string().nullable().describe('House number'),
  geoLat: z.string().nullable().describe('Latitude'),
  geoLon: z.string().nullable().describe('Longitude'),
  fiasId: z.string().nullable().describe('FIAS identifier'),
  kladrId: z.string().nullable().describe('KLADR identifier'),
  timezone: z.string().nullable().describe('Timezone')
});

export let reverseGeocode = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Finds addresses near given geographic coordinates (reverse geocoding). Returns all information about nearby addresses ordered by distance from the specified point.
Useful for determining the closest address to a GPS location.`,
  instructions: [
    'Provide latitude and longitude as decimal numbers.',
    'Adjust radiusMeters to widen or narrow the search area (default 100m, max 1000m).'
  ],
  constraints: [
    'Maximum search radius: 1000 meters.',
    'Coverage varies: Moscow ~97%, large cities ~69%, rest of Russia ~47%.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the point'),
      longitude: z.number().describe('Longitude of the point'),
      count: z.number().optional().describe('Number of results (max 20, default 10)'),
      radiusMeters: z
        .number()
        .optional()
        .describe('Search radius in meters (max 1000, default 100)'),
      language: z.enum(['ru', 'en']).optional().describe('Response language')
    })
  )
  .output(
    z.object({
      addresses: z
        .array(reverseGeoResultSchema)
        .describe('Nearby addresses ordered by distance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.geolocateAddress({
      lat: ctx.input.latitude,
      lon: ctx.input.longitude,
      count: ctx.input.count,
      radiusMeters: ctx.input.radiusMeters,
      language: ctx.input.language || ctx.config.language
    });

    let addresses = (data.suggestions || []).map((s: any) => ({
      value: s.value || '',
      unrestrictedValue: s.unrestricted_value || '',
      postalCode: s.data?.postal_code ?? null,
      country: s.data?.country ?? null,
      region: s.data?.region ?? null,
      city: s.data?.city ?? null,
      street: s.data?.street ?? null,
      house: s.data?.house ?? null,
      geoLat: s.data?.geo_lat ?? null,
      geoLon: s.data?.geo_lon ?? null,
      fiasId: s.data?.fias_id ?? null,
      kladrId: s.data?.kladr_id ?? null,
      timezone: s.data?.timezone ?? null
    }));

    return {
      output: { addresses },
      message:
        addresses.length > 0
          ? `Found **${addresses.length}** address(es) near (${ctx.input.latitude}, ${ctx.input.longitude}): ${addresses[0]?.value || 'N/A'}`
          : `No addresses found near (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();
