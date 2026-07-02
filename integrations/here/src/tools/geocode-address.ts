import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    label: z.string().optional().describe('Full formatted address label'),
    countryCode: z.string().optional().describe('ISO 3166-1 alpha-3 country code'),
    countryName: z.string().optional().describe('Country name'),
    stateCode: z.string().optional().describe('State/province code'),
    state: z.string().optional().describe('State/province name'),
    county: z.string().optional().describe('County name'),
    city: z.string().optional().describe('City name'),
    district: z.string().optional().describe('District name'),
    street: z.string().optional().describe('Street name'),
    postalCode: z.string().optional().describe('Postal code'),
    houseNumber: z.string().optional().describe('House number')
  })
  .describe('Structured address information');

let positionSchema = z
  .object({
    lat: z.number().describe('Latitude'),
    lng: z.number().describe('Longitude')
  })
  .describe('Geographic coordinates');

let geocodeResultSchema = z.object({
  title: z.string().optional().describe('Result title/label'),
  resultId: z.string().optional().describe('Unique result identifier'),
  hereId: z.string().optional().describe('HERE place ID for use with the lookup tool'),
  resultType: z
    .string()
    .optional()
    .describe('Result type (e.g. houseNumber, street, locality)'),
  address: addressSchema.optional(),
  position: positionSchema.optional(),
  mapView: z
    .object({
      west: z.number().optional(),
      south: z.number().optional(),
      east: z.number().optional(),
      north: z.number().optional()
    })
    .optional()
    .describe('Bounding box for map display'),
  scoring: z
    .object({
      queryScore: z.number().optional(),
      fieldScore: z.any().optional()
    })
    .optional()
    .describe('Relevance scoring')
});

export let geocodeAddress = SlateTool.create(spec, {
  name: 'Geocode Address',
  key: 'geocode_address',
  description: `Convert a free-form address or structured address components into geographic coordinates (latitude/longitude). Supports worldwide address geocoding with relevance scoring.
Use a free-form query string like "240 Washington St, Boston" or structured fields like city, street, postalCode separately.`,
  instructions: [
    'Provide either a free-form query OR structured query fields (city, street, etc.) — not both.',
    'Use the "at" parameter to bias results toward a specific location.',
    'Use "inArea" to restrict results to a country (e.g. "countryCode:USA") or bounding box.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Free-form address query (e.g. "240 Washington St, Boston, MA")'),
      qualifiedQuery: z
        .string()
        .optional()
        .describe(
          'Structured query with semicolon-separated fields like "city=Berlin;street=Friedrichstr;houseNumber=20"'
        ),
      at: z
        .string()
        .optional()
        .describe('Center point for relevance ranking as "lat,lng" (e.g. "52.5308,13.3847")'),
      inArea: z
        .string()
        .optional()
        .describe(
          'Geographic filter (e.g. "countryCode:USA", "bbox:west,south,east,north", "circle:lat,lng;r=radius")'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 20)'),
      lang: z
        .string()
        .optional()
        .describe('BCP 47 language code for response (e.g. "en-US", "de-DE")')
    })
  )
  .output(
    z.object({
      results: z.array(geocodeResultSchema).describe('Geocoding results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response = await client.geocode({
      query: ctx.input.query,
      qualifiedQuery: ctx.input.qualifiedQuery,
      at: ctx.input.at,
      inArea: ctx.input.inArea,
      limit: ctx.input.limit,
      lang: ctx.input.lang
    });

    let items = response.items || [];
    let results = items.map((item: any) => ({
      title: item.title,
      resultId: item.id,
      hereId: item.id,
      resultType: item.resultType,
      address: item.address,
      position: item.position,
      mapView: item.mapView,
      scoring: item.scoring
    }));

    return {
      output: { results },
      message:
        results.length > 0
          ? `Found **${results.length}** result(s). Top result: **${results[0].title}** at (${results[0].position?.lat}, ${results[0].position?.lng}).`
          : 'No geocoding results found for the given query.'
    };
  })
  .build();
