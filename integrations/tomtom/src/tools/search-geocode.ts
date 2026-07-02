import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

let positionSchema = z.object({
  lat: z.number().describe('Latitude'),
  lon: z.number().describe('Longitude')
});

let addressSchema = z.object({
  streetNumber: z.string().optional().describe('Street number'),
  streetName: z.string().optional().describe('Street name'),
  municipality: z.string().optional().describe('City or town'),
  countrySubdivision: z.string().optional().describe('State or province code'),
  postalCode: z.string().optional().describe('Postal or ZIP code'),
  countryCode: z.string().optional().describe('Country code (ISO 3166-1 alpha-2)'),
  country: z.string().optional().describe('Country name'),
  freeformAddress: z.string().optional().describe('Full formatted address')
});

let searchResultSchema = z.object({
  resultType: z.string().describe('Type of result (POI, Point Address, Street, etc.)'),
  resultId: z.string().optional().describe('Unique result identifier'),
  score: z.number().optional().describe('Relevance score'),
  distanceInMeters: z.number().optional().describe('Distance from bias point in meters'),
  poiName: z.string().optional().describe('Point of interest name'),
  poiPhone: z.string().optional().describe('POI phone number'),
  poiUrl: z.string().optional().describe('POI website URL'),
  poiCategories: z.array(z.string()).optional().describe('POI categories'),
  address: addressSchema.optional().describe('Address information'),
  position: positionSchema.optional().describe('Geographic coordinates')
});

export let searchGeocode = SlateTool.create(spec, {
  name: 'Search & Geocode',
  key: 'search_geocode',
  description: `Search for addresses, places, and points of interest using TomTom's fuzzy search. Supports free-text queries, structured address lookups, and autocomplete suggestions. Geo-bias results around a specific location and filter by country or category.`,
  instructions: [
    'Use the "query" field for free-text search (addresses, POI names, coordinates)',
    'Set "lat" and "lon" to bias results near a specific location',
    'Use "countrySet" to restrict results to specific countries (comma-separated ISO codes, e.g. "US,CA")',
    'Use "categorySet" to filter by POI categories (comma-separated category IDs)'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query (address, place name, or coordinates)'),
      lat: z.number().optional().describe('Latitude to bias results toward'),
      lon: z.number().optional().describe('Longitude to bias results toward'),
      radius: z.number().optional().describe('Search radius in meters around the bias point'),
      limit: z.number().optional().describe('Maximum number of results (1-100, default 10)'),
      countrySet: z
        .string()
        .optional()
        .describe('Comma-separated country codes to restrict results (e.g. "US,CA")'),
      language: z
        .string()
        .optional()
        .describe('Language for results (IETF tag, e.g. "en-US")'),
      categorySet: z
        .string()
        .optional()
        .describe('Comma-separated POI category IDs to filter by')
    })
  )
  .output(
    z.object({
      totalResults: z.number().describe('Total number of matching results'),
      results: z.array(searchResultSchema).describe('Search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.fuzzySearch({
      query: ctx.input.query,
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      radius: ctx.input.radius,
      limit: ctx.input.limit,
      countrySet: ctx.input.countrySet,
      language: ctx.input.language,
      categorySet: ctx.input.categorySet
    });

    let results = (data.results || []).map((r: any) => ({
      resultType: r.type || 'Unknown',
      resultId: r.id,
      score: r.score,
      distanceInMeters: r.dist,
      poiName: r.poi?.name,
      poiPhone: r.poi?.phone,
      poiUrl: r.poi?.url,
      poiCategories: r.poi?.categories,
      address: r.address
        ? {
            streetNumber: r.address.streetNumber,
            streetName: r.address.streetName,
            municipality: r.address.municipality,
            countrySubdivision: r.address.countrySubdivision,
            postalCode: r.address.postalCode,
            countryCode: r.address.countryCode,
            country: r.address.country,
            freeformAddress: r.address.freeformAddress
          }
        : undefined,
      position: r.position ? { lat: r.position.lat, lon: r.position.lon } : undefined
    }));

    return {
      output: {
        totalResults: data.summary?.totalResults || results.length,
        results
      },
      message: `Found **${results.length}** results for "${ctx.input.query}".`
    };
  })
  .build();
