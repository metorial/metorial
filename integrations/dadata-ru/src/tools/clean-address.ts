import { SlateTool } from 'slates';
import { z } from 'zod';
import { CleanerClient } from '../lib/client';
import { spec } from '../spec';

export let cleanAddress = SlateTool.create(spec, {
  name: 'Clean Address',
  key: 'clean_address',
  description: `Standardizes and enriches a raw address string. Corrects errors, normalizes formatting, and returns structured address fields with coordinates, quality codes, postal code, metro stations, and property data.
Requires the Secret Key in addition to the API Key.`,
  constraints: [
    'Requires both API Key and Secret Key for authentication.',
    'Rate limit: 20 requests/sec per IP.',
    'Charged at 20 kopecks per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      address: z.string().describe('Raw address string to standardize')
    })
  )
  .output(
    z.object({
      source: z.string().describe('Original input address'),
      result: z.string().nullable().describe('Standardized address'),
      postalCode: z.string().nullable().describe('Postal code'),
      country: z.string().nullable().describe('Country name'),
      countryIsoCode: z.string().nullable().describe('ISO country code'),
      regionWithType: z.string().nullable().describe('Region with type prefix'),
      region: z.string().nullable().describe('Region name'),
      cityWithType: z.string().nullable().describe('City with type prefix'),
      city: z.string().nullable().describe('City name'),
      cityDistrict: z.string().nullable().describe('City district'),
      streetWithType: z.string().nullable().describe('Street with type prefix'),
      street: z.string().nullable().describe('Street name'),
      house: z.string().nullable().describe('House number'),
      flat: z.string().nullable().describe('Flat/apartment number'),
      flatArea: z.string().nullable().describe('Flat area in square meters'),
      flatPrice: z.string().nullable().describe('Estimated flat price in rubles'),
      geoLat: z.string().nullable().describe('Latitude'),
      geoLon: z.string().nullable().describe('Longitude'),
      fiasId: z.string().nullable().describe('FIAS identifier'),
      kladrId: z.string().nullable().describe('KLADR identifier'),
      timezone: z.string().nullable().describe('Timezone'),
      qualityCode: z
        .number()
        .nullable()
        .describe(
          'Quality code: 0=confident, 1=needs review, 2=empty/spam, 3=alternatives exist'
        ),
      qualityGeo: z
        .number()
        .nullable()
        .describe(
          'Coordinate quality: 0=exact, 1=nearest house, 2=street, 3=settlement, 4=city, 5=unknown'
        ),
      metro: z
        .array(
          z.object({
            name: z.string().describe('Metro station name'),
            line: z.string().describe('Metro line name'),
            distance: z.number().describe('Distance in km')
          })
        )
        .nullable()
        .describe('Nearest metro stations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CleanerClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.cleanAddress(ctx.input.address);
    let r = Array.isArray(data) ? data[0] : data;

    let metro = r?.metro
      ? r.metro.map((m: any) => ({
          name: m.name || '',
          line: m.line || '',
          distance: m.distance || 0
        }))
      : null;

    return {
      output: {
        source: r?.source || ctx.input.address,
        result: r?.result ?? null,
        postalCode: r?.postal_code ?? null,
        country: r?.country ?? null,
        countryIsoCode: r?.country_iso_code ?? null,
        regionWithType: r?.region_with_type ?? null,
        region: r?.region ?? null,
        cityWithType: r?.city_with_type ?? null,
        city: r?.city ?? null,
        cityDistrict: r?.city_district ?? null,
        streetWithType: r?.street_with_type ?? null,
        street: r?.street ?? null,
        house: r?.house ?? null,
        flat: r?.flat ?? null,
        flatArea: r?.flat_area ?? null,
        flatPrice: r?.flat_price ?? null,
        geoLat: r?.geo_lat ?? null,
        geoLon: r?.geo_lon ?? null,
        fiasId: r?.fias_id ?? null,
        kladrId: r?.kladr_id ?? null,
        timezone: r?.timezone ?? null,
        qualityCode: r?.qc ?? null,
        qualityGeo: r?.qc_geo ?? null,
        metro
      },
      message: r?.result
        ? `Standardized address: **${r.result}** (quality: ${r.qc})`
        : `Could not standardize the address "${ctx.input.address}".`
    };
  })
  .build();
