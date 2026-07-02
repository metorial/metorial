import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchApiClient } from '../lib/client';
import { spec } from '../spec';

let localResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Business name'),
  placeId: z.string().optional().describe('Google Place ID'),
  address: z.string().optional().describe('Full address'),
  phone: z.string().optional().describe('Phone number'),
  website: z.string().optional().describe('Website URL'),
  rating: z.number().optional().describe('Average rating (0-5)'),
  reviewCount: z.number().optional().describe('Number of reviews'),
  type: z.string().optional().describe('Business type/category'),
  latitude: z.number().optional().describe('GPS latitude'),
  longitude: z.number().optional().describe('GPS longitude'),
  hours: z.string().optional().describe('Business hours summary'),
  priceLevel: z.string().optional().describe('Price level indicator'),
  thumbnail: z.string().optional().describe('Business thumbnail URL')
});

export let mapsSearch = SlateTool.create(spec, {
  name: 'Google Maps Search',
  key: 'maps_search',
  description: `Search Google Maps for local businesses and places. Returns structured local results with addresses, ratings, reviews, phone numbers, GPS coordinates, and business hours. Ideal for finding businesses, restaurants, services, and points of interest.`,
  instructions: [
    'Use **coordinates** (e.g., "@40.7128,-74.0060,14z") to search around a specific GPS location.',
    'Queries like "restaurants near Times Square" work well for location-based searches.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Maps search query (e.g., "restaurants near me", "Starbucks New York")'),
      coordinates: z
        .string()
        .optional()
        .describe(
          'GPS coordinates as "@latitude,longitude,zoom" (e.g., "@40.7128,-74.0060,14z")'
        ),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      language: z.string().optional().describe('Interface language code'),
      page: z.number().optional().describe('Results page number')
    })
  )
  .output(
    z.object({
      searchQuery: z.string().optional().describe('The query that was searched'),
      localResults: z.array(localResultSchema).describe('Local business results'),
      currentPage: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchApiClient({ token: ctx.auth.token });

    let data = await client.search({
      engine: 'google_maps',
      q: ctx.input.query,
      ll: ctx.input.coordinates,
      gl: ctx.input.country,
      hl: ctx.input.language,
      page: ctx.input.page
    });

    let localResults = (data.local_results || []).map((r: any) => ({
      position: r.position,
      title: r.title,
      placeId: r.place_id || r.data_cid,
      address: r.address,
      phone: r.phone,
      website: r.website,
      rating: r.rating,
      reviewCount: r.reviews,
      type: r.type,
      latitude: r.gps_coordinates?.latitude,
      longitude: r.gps_coordinates?.longitude,
      hours: r.hours || r.operating_hours?.currently,
      priceLevel: r.price,
      thumbnail: r.thumbnail
    }));

    return {
      output: {
        searchQuery: data.search_parameters?.q || ctx.input.query,
        localResults,
        currentPage: data.pagination?.current
      },
      message: `Found ${localResults.length} local result${localResults.length !== 1 ? 's' : ''} for "${ctx.input.query}".`
    };
  })
  .build();
