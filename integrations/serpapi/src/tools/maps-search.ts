import { SlateTool } from 'slates';
import { z } from 'zod';
import { SerpApiClient } from '../lib/client';
import { spec } from '../spec';

let localResultSchema = z.object({
  position: z.number().optional().describe('Position in results'),
  title: z.string().optional().describe('Business name'),
  placeId: z.string().optional().describe('Google Place ID'),
  dataId: z.string().optional().describe('Google data ID'),
  dataCid: z.string().optional().describe('Google CID'),
  rating: z.number().optional().describe('Average rating'),
  reviewCount: z.number().optional().describe('Number of reviews'),
  price: z.string().optional().describe('Price level indicator'),
  businessType: z.string().optional().describe('Type of business'),
  address: z.string().optional().describe('Full address'),
  phone: z.string().optional().describe('Phone number'),
  website: z.string().optional().describe('Website URL'),
  openState: z.string().optional().describe('Current open/closed state'),
  hours: z.string().optional().describe('Operating hours summary'),
  description: z.string().optional().describe('Business description'),
  latitude: z.number().optional().describe('GPS latitude'),
  longitude: z.number().optional().describe('GPS longitude'),
  thumbnailUrl: z.string().optional().describe('Business thumbnail URL'),
  serviceOptions: z
    .object({
      dineIn: z.boolean().optional(),
      takeout: z.boolean().optional(),
      delivery: z.boolean().optional()
    })
    .optional()
    .describe('Available service options')
});

export let mapsSearchTool = SlateTool.create(spec, {
  name: 'Maps Search',
  key: 'maps_search',
  description: `Search Google Maps for local businesses, places, and points of interest. Returns business names, addresses, ratings, reviews, phone numbers, websites, operating hours, GPS coordinates, and service options. Can also retrieve detailed information for a specific place.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query (e.g., "pizza near me", "hotels in Paris")'),
      dataCid: z
        .string()
        .optional()
        .describe('Google CID to look up a specific place directly'),
      coordinates: z
        .string()
        .optional()
        .describe(
          'GPS coordinates in "@lat,lng,zoom" format (e.g., "@40.7455096,-74.0083012,14z")'
        ),
      language: z.string().optional().describe('Language code (e.g., "en")'),
      country: z.string().optional().describe('Country code (e.g., "us")'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination (0-indexed, increments of 20)'),
      noCache: z.boolean().optional().describe('Force fresh results')
    })
  )
  .output(
    z.object({
      localResults: z.array(localResultSchema).describe('Local business/place results'),
      placeDetails: z
        .object({
          title: z.string().optional(),
          placeId: z.string().optional(),
          rating: z.number().optional(),
          reviewCount: z.number().optional(),
          address: z.string().optional(),
          phone: z.string().optional(),
          website: z.string().optional(),
          description: z.string().optional(),
          hours: z.any().optional()
        })
        .optional()
        .describe('Detailed place information (when looking up a specific place)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SerpApiClient({ apiKey: ctx.auth.token });

    let params: Record<string, any> = {
      engine: 'google_maps'
    };

    if (ctx.input.dataCid) {
      params.data_cid = ctx.input.dataCid;
      params.type = 'place';
    } else {
      params.q = ctx.input.query;
      params.type = 'search';
    }

    if (ctx.input.coordinates) params.ll = ctx.input.coordinates;
    if (ctx.input.language) params.hl = ctx.input.language;
    if (ctx.input.country) params.gl = ctx.input.country;
    if (ctx.input.page !== undefined) params.start = ctx.input.page * 20;
    if (ctx.input.noCache) params.no_cache = ctx.input.noCache;

    let data = await client.search(params);

    let localResults = (data.local_results || []).map((r: any) => ({
      position: r.position,
      title: r.title,
      placeId: r.place_id,
      dataId: r.data_id,
      dataCid: r.data_cid,
      rating: r.rating,
      reviewCount: r.reviews,
      price: r.price,
      businessType: r.type,
      address: r.address,
      phone: r.phone,
      website: r.website,
      openState: r.open_state,
      hours: r.hours,
      description: r.description,
      latitude: r.gps_coordinates?.latitude,
      longitude: r.gps_coordinates?.longitude,
      thumbnailUrl: r.thumbnail,
      serviceOptions: r.service_options
        ? {
            dineIn: r.service_options.dine_in,
            takeout: r.service_options.takeout,
            delivery: r.service_options.delivery
          }
        : undefined
    }));

    let placeDetails = data.place_results
      ? {
          title: data.place_results.title,
          placeId: data.place_results.place_id,
          rating: data.place_results.rating,
          reviewCount: data.place_results.reviews,
          address: data.place_results.address,
          phone: data.place_results.phone,
          website: data.place_results.website,
          description: data.place_results.description,
          hours: data.place_results.operating_hours
        }
      : undefined;

    let resultCount = localResults.length;
    let message = placeDetails
      ? `Retrieved place details for **${placeDetails.title}**${placeDetails.rating ? ` (${placeDetails.rating} stars)` : ''}.`
      : `Maps search${ctx.input.query ? ` for "${ctx.input.query}"` : ''} returned **${resultCount}** local results.`;

    return {
      output: {
        localResults,
        placeDetails
      },
      message
    };
  })
  .build();
