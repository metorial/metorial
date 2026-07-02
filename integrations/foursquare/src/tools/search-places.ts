import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  fsq_id: z.string().optional(),
  name: z.string().optional(),
  short_name: z.string().optional(),
  plural_name: z.string().optional(),
  icon: z
    .object({
      prefix: z.string().optional(),
      suffix: z.string().optional()
    })
    .optional()
});

let locationSchema = z.object({
  address: z.string().optional(),
  address_extended: z.string().optional(),
  census_block: z.string().optional(),
  country: z.string().optional(),
  cross_street: z.string().optional(),
  dma: z.string().optional(),
  formatted_address: z.string().optional(),
  locality: z.string().optional(),
  neighborhood: z.array(z.string()).optional(),
  po_box: z.string().optional(),
  post_town: z.string().optional(),
  postcode: z.string().optional(),
  region: z.string().optional()
});

let geocodesSchema = z.object({
  main: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional()
    })
    .optional(),
  roof: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional()
    })
    .optional()
});

let placeSchema = z.object({
  fsq_id: z.string().describe('Foursquare place ID'),
  name: z.string().optional().describe('Place name'),
  categories: z.array(categorySchema).optional().describe('Place categories'),
  chains: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional(),
  closed_bucket: z.string().optional().describe('Indicates closure status'),
  distance: z.number().optional().describe('Distance in meters from search point'),
  geocodes: geocodesSchema.optional(),
  link: z.string().optional(),
  location: locationSchema.optional(),
  timezone: z.string().optional()
});

export let searchPlaces = SlateTool.create(spec, {
  name: 'Search Places',
  key: 'search_places',
  description: `Search for places (points of interest) in the Foursquare database. Supports searching by keyword, location, category, chain, and geographic area. Results can be filtered by price range, operating hours, and sorted by relevance, rating, distance, or popularity.`,
  instructions: [
    'Provide at least one of: query, ll (latitude,longitude), near (place name), or a bounding box (ne + sw).',
    'Use comma-separated category IDs in the categories field to filter by place type.',
    'The fields parameter accepts a comma-separated list of response fields to include.'
  ],
  constraints: [
    'Maximum 50 results per request (default 10).',
    'Radius is in meters, maximum 100,000.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search keyword (e.g. "coffee", "pizza")'),
      latitude: z.number().optional().describe('Latitude of the search center'),
      longitude: z.number().optional().describe('Longitude of the search center'),
      radius: z.number().optional().describe('Search radius in meters (max 100000)'),
      categories: z
        .string()
        .optional()
        .describe('Comma-separated Foursquare category IDs to filter by'),
      chains: z.string().optional().describe('Comma-separated chain IDs to filter by'),
      excludeAllChains: z.boolean().optional().describe('Exclude chain venues from results'),
      fields: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to include in the response'),
      minPrice: z.number().optional().describe('Minimum price level (1-4)'),
      maxPrice: z.number().optional().describe('Maximum price level (1-4)'),
      openAt: z
        .string()
        .optional()
        .describe('ISO 8601 datetime to check if place is open at a specific time'),
      openNow: z.boolean().optional().describe('Only return places currently open'),
      near: z.string().optional().describe('Place name to search near (e.g. "New York, NY")'),
      sort: z
        .enum(['relevance', 'rating', 'distance', 'popularity'])
        .optional()
        .describe('Sort order for results'),
      limit: z.number().optional().describe('Maximum number of results (1-50, default 10)'),
      ne: z
        .string()
        .optional()
        .describe('Northeast corner of bounding box (latitude,longitude)'),
      sw: z
        .string()
        .optional()
        .describe('Southwest corner of bounding box (latitude,longitude)')
    })
  )
  .output(
    z.object({
      places: z.array(placeSchema).describe('List of matching places')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ll =
      ctx.input.latitude && ctx.input.longitude
        ? `${ctx.input.latitude},${ctx.input.longitude}`
        : undefined;

    let result = await client.searchPlaces({
      query: ctx.input.query,
      ll,
      radius: ctx.input.radius,
      categories: ctx.input.categories,
      chains: ctx.input.chains,
      exclude_all_chains: ctx.input.excludeAllChains,
      fields: ctx.input.fields,
      min_price: ctx.input.minPrice,
      max_price: ctx.input.maxPrice,
      open_at: ctx.input.openAt,
      open_now: ctx.input.openNow,
      near: ctx.input.near,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      ne: ctx.input.ne,
      sw: ctx.input.sw
    });

    let places = result.results || [];

    return {
      output: { places },
      message: `Found **${places.length}** place(s)${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}${ctx.input.near ? ` near ${ctx.input.near}` : ''}.`
    };
  })
  .build();
