import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuggestionsClient } from '../lib/client';
import { spec } from '../spec';

let addressSuggestionSchema = z.object({
  value: z.string().describe('Formatted address string'),
  unrestrictedValue: z.string().describe('Full address without restrictions applied'),
  postalCode: z.string().nullable().describe('Postal code'),
  country: z.string().nullable().describe('Country name'),
  countryIsoCode: z.string().nullable().describe('ISO country code'),
  federalDistrict: z.string().nullable().describe('Federal district'),
  regionWithType: z.string().nullable().describe('Region with type prefix'),
  region: z.string().nullable().describe('Region name'),
  cityWithType: z.string().nullable().describe('City with type prefix'),
  city: z.string().nullable().describe('City name'),
  streetWithType: z.string().nullable().describe('Street with type prefix'),
  street: z.string().nullable().describe('Street name'),
  house: z.string().nullable().describe('House number'),
  flat: z.string().nullable().describe('Flat/apartment number'),
  geoLat: z.string().nullable().describe('Latitude'),
  geoLon: z.string().nullable().describe('Longitude'),
  fiasId: z.string().nullable().describe('FIAS identifier'),
  kladrId: z.string().nullable().describe('KLADR identifier'),
  timezone: z.string().nullable().describe('Timezone, e.g. UTC+3'),
  qualityGeo: z
    .string()
    .nullable()
    .describe(
      'Coordinate quality code: 0=exact, 1=nearest house, 2=street, 3=settlement, 4=city, 5=unknown'
    )
});

export let suggestAddress = SlateTool.create(spec, {
  name: 'Suggest Address',
  key: 'suggest_address',
  description: `Provides type-ahead address autocomplete suggestions as the user types. Returns structured address data including coordinates, FIAS/KLADR identifiers, and quality codes.
Results can be constrained by region, geographic coordinates/radius, or bounded to specific granularity levels (region, city, street, house). Supports both Russian and English language output.`,
  instructions: [
    'Use fromBound and toBound to limit suggestion granularity (e.g., fromBound="city", toBound="street" to suggest only streets within cities).',
    'Use locations to restrict results to specific regions by KLADR or FIAS ID.',
    'Use locationsBoost to prioritize (but not restrict) results from specific cities.'
  ],
  constraints: [
    'Maximum 20 results per request.',
    'Query string limited to 300 characters.',
    'Rate limit: 30 requests/sec per IP.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Address search text (max 300 characters)'),
      count: z
        .number()
        .optional()
        .describe('Number of results to return (max 20, default 10)'),
      language: z.enum(['ru', 'en']).optional().describe('Response language'),
      fromBound: z
        .enum(['country', 'region', 'area', 'city', 'settlement', 'street', 'house'])
        .optional()
        .describe('Lower granularity bound for suggestions'),
      toBound: z
        .enum(['country', 'region', 'area', 'city', 'settlement', 'street', 'house'])
        .optional()
        .describe('Upper granularity bound for suggestions'),
      locations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Region constraints (e.g., [{"kladr_id": "77"}] for Moscow)'),
      locationsGeo: z
        .array(
          z.object({
            lat: z.number().describe('Latitude'),
            lon: z.number().describe('Longitude'),
            radiusMeters: z.number().describe('Search radius in meters')
          })
        )
        .optional()
        .describe('Geographic coordinate constraints'),
      locationsBoost: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Boost priority for specific cities/regions'),
      restrictValue: z
        .boolean()
        .optional()
        .describe('Hide restriction scope in the suggestion value')
    })
  )
  .output(
    z.object({
      suggestions: z.array(addressSuggestionSchema).describe('List of address suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuggestionsClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let data = await client.suggestAddress({
      query: ctx.input.query,
      count: ctx.input.count,
      language: ctx.input.language || ctx.config.language,
      locations: ctx.input.locations,
      locationsGeo: ctx.input.locationsGeo,
      locationsBoost: ctx.input.locationsBoost,
      fromBound: ctx.input.fromBound,
      toBound: ctx.input.toBound,
      restrictValue: ctx.input.restrictValue
    });

    let suggestions = (data.suggestions || []).map((s: any) => ({
      value: s.value || '',
      unrestrictedValue: s.unrestricted_value || '',
      postalCode: s.data?.postal_code ?? null,
      country: s.data?.country ?? null,
      countryIsoCode: s.data?.country_iso_code ?? null,
      federalDistrict: s.data?.federal_district ?? null,
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
      kladrId: s.data?.kladr_id ?? null,
      timezone: s.data?.timezone ?? null,
      qualityGeo: s.data?.qc_geo != null ? String(s.data.qc_geo) : null
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** address suggestion(s) for "${ctx.input.query}".`
    };
  })
  .build();
