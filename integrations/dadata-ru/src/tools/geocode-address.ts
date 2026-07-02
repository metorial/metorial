import { SlateTool } from 'slates';
import { z } from 'zod';
import { CleanerClient } from '../lib/client';
import { spec } from '../spec';

export let geocodeAddress = SlateTool.create(spec, {
  name: 'Geocode Address',
  key: 'geocode_address',
  description: `Converts an address string to geographic coordinates (latitude/longitude). Also returns the postal code and full structured address data.
Uses the address standardization endpoint which provides geocoding as part of the cleaning process.`,
  constraints: ['Requires both API Key and Secret Key.', 'Rate limit: 20 requests/sec.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address: z.string().describe('Address string to geocode')
    })
  )
  .output(
    z.object({
      standardizedAddress: z.string().nullable().describe('Standardized address'),
      latitude: z.string().nullable().describe('Latitude'),
      longitude: z.string().nullable().describe('Longitude'),
      postalCode: z.string().nullable().describe('Postal code'),
      qualityGeo: z
        .number()
        .nullable()
        .describe(
          'Coordinate quality: 0=exact, 1=nearest house, 2=street, 3=settlement, 4=city, 5=unknown'
        ),
      qualityCode: z
        .number()
        .nullable()
        .describe('Address quality: 0=confident, 1=needs review, 2=empty, 3=alternatives'),
      fiasId: z.string().nullable().describe('FIAS identifier'),
      kladrId: z.string().nullable().describe('KLADR identifier'),
      country: z.string().nullable().describe('Country'),
      region: z.string().nullable().describe('Region'),
      city: z.string().nullable().describe('City'),
      street: z.string().nullable().describe('Street'),
      house: z.string().nullable().describe('House number'),
      timezone: z.string().nullable().describe('Timezone')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CleanerClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.cleanAddress(ctx.input.address);
    let r = Array.isArray(data) ? data[0] : data;

    return {
      output: {
        standardizedAddress: r?.result ?? null,
        latitude: r?.geo_lat ?? null,
        longitude: r?.geo_lon ?? null,
        postalCode: r?.postal_code ?? null,
        qualityGeo: r?.qc_geo ?? null,
        qualityCode: r?.qc ?? null,
        fiasId: r?.fias_id ?? null,
        kladrId: r?.kladr_id ?? null,
        country: r?.country ?? null,
        region: r?.region ?? null,
        city: r?.city ?? null,
        street: r?.street ?? null,
        house: r?.house ?? null,
        timezone: r?.timezone ?? null
      },
      message:
        r?.geo_lat && r?.geo_lon
          ? `Geocoded "${ctx.input.address}" → **${r.geo_lat}, ${r.geo_lon}** (quality: ${r.qc_geo})`
          : `Could not geocode "${ctx.input.address}".`
    };
  })
  .build();
