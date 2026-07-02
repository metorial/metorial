import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let addressDetailSchema = z.object({
  value: z.string().describe('Formatted address'),
  unrestrictedValue: z.string().describe('Full address'),
  postalCode: z.string().nullable().describe('Postal code'),
  country: z.string().nullable().describe('Country'),
  countryIsoCode: z.string().nullable().describe('ISO country code'),
  regionWithType: z.string().nullable().describe('Region with type'),
  region: z.string().nullable().describe('Region name'),
  cityWithType: z.string().nullable().describe('City with type'),
  city: z.string().nullable().describe('City name'),
  streetWithType: z.string().nullable().describe('Street with type'),
  street: z.string().nullable().describe('Street name'),
  house: z.string().nullable().describe('House number'),
  flat: z.string().nullable().describe('Flat/apartment number'),
  geoLat: z.string().nullable().describe('Latitude'),
  geoLon: z.string().nullable().describe('Longitude'),
  fiasId: z.string().nullable().describe('FIAS identifier'),
  fiasLevel: z.string().nullable().describe('FIAS granularity level'),
  kladrId: z.string().nullable().describe('KLADR identifier'),
  timezone: z.string().nullable().describe('Timezone'),
  taxOffice: z.string().nullable().describe('Tax office code'),
  okato: z.string().nullable().describe('OKATO code'),
  oktmo: z.string().nullable().describe('OKTMO code')
});

export let lookupAddress = SlateTool.create(spec, {
  name: 'Lookup Address',
  key: 'lookup_address',
  description: `Looks up a specific address by FIAS ID, KLADR code, cadastral number, or GeoNames/OpenStreetMap ID. Returns detailed structured address data including coordinates and all administrative identifiers.
Use this for precise address lookups when you have a specific identifier rather than a text search.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('FIAS ID, KLADR code, cadastral number, or GeoNames/OSM ID'),
      count: z.number().optional().describe('Number of results (max 20)'),
      language: z.enum(['ru', 'en']).optional().describe('Response language')
    })
  )
  .output(
    z.object({
      addresses: z.array(addressDetailSchema).describe('Matched addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.findById('address', {
      query: ctx.input.query,
      count: ctx.input.count,
      language: ctx.input.language || ctx.config.language
    });

    let addresses = (data.suggestions || []).map((s: any) => ({
      value: s.value || '',
      unrestrictedValue: s.unrestricted_value || '',
      postalCode: s.data?.postal_code ?? null,
      country: s.data?.country ?? null,
      countryIsoCode: s.data?.country_iso_code ?? null,
      regionWithType: s.data?.region_with_type ?? null,
      region: s.data?.region ?? null,
      cityWithType: s.data?.city_with_type ?? null,
      city: s.data?.city ?? null,
      streetWithType: s.data?.street_with_type ?? null,
      street: s.data?.street ?? null,
      house: s.data?.house ?? null,
      flat: s.data?.flat ?? null,
      geoLat: s.data?.geo_lat ?? null,
      geoLon: s.data?.geo_lon ?? null,
      fiasId: s.data?.fias_id ?? null,
      fiasLevel: s.data?.fias_level ?? null,
      kladrId: s.data?.kladr_id ?? null,
      timezone: s.data?.timezone ?? null,
      taxOffice: s.data?.tax_office ?? null,
      okato: s.data?.okato ?? null,
      oktmo: s.data?.oktmo ?? null
    }));

    return {
      output: { addresses },
      message:
        addresses.length > 0
          ? `Found **${addresses.length}** address(es) for "${ctx.input.query}": ${addresses[0]?.value || 'N/A'}`
          : `No addresses found for "${ctx.input.query}".`
    };
  })
  .build();
