import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let searchPlaces = SlateTool.create(spec, {
  name: 'Search Places',
  key: 'search_places',
  description: `Search for points of interest and amenities by category and location. Supports ~400 POI categories in a hierarchical system (e.g. "catering.restaurant", "accommodation.hotel", "commercial.supermarket"). Results include names, addresses, coordinates, opening hours, and contact info.`,
  instructions: [
    'You must provide at least one spatial parameter: filter or bias.',
    'Filter syntax: "circle:lon,lat,radiusMeters", "rect:west,south,east,north", "place:placeId".',
    'Bias syntax: "proximity:lon,lat".',
    'Categories are hierarchical — use parent categories to search broadly (e.g. "catering") or specific subcategories (e.g. "catering.restaurant.pizza").',
    'Common categories: catering, catering.restaurant, catering.cafe, accommodation, commercial.supermarket, tourism.sights, entertainment, sport, parking, healthcare, education.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      categories: z
        .string()
        .describe(
          'Comma-separated place categories (e.g. "catering.restaurant,catering.cafe")'
        ),
      filter: z
        .string()
        .optional()
        .describe(
          'Hard geographic boundary (e.g. "circle:-87.770,41.878,5000" or "rect:west,south,east,north")'
        ),
      bias: z
        .string()
        .optional()
        .describe('Soft proximity preference (e.g. "proximity:-87.770,41.878")'),
      conditions: z
        .string()
        .optional()
        .describe('Attribute filters (e.g. "wheelchair", "internet_access", "vegetarian")'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset'),
      lang: z.string().optional().describe('ISO 639-1 language code for results'),
      name: z.string().optional().describe('Filter by establishment name')
    })
  )
  .output(
    z.object({
      places: z
        .array(
          z.object({
            placeId: z.string().optional().describe('Unique place identifier'),
            name: z.string().optional().describe('Place name'),
            categories: z.array(z.string()).optional().describe('Place categories'),
            lat: z.number().optional().describe('Latitude'),
            lon: z.number().optional().describe('Longitude'),
            formatted: z.string().optional().describe('Formatted address'),
            street: z.string().optional().describe('Street name'),
            housenumber: z.string().optional().describe('House number'),
            city: z.string().optional().describe('City'),
            state: z.string().optional().describe('State'),
            postcode: z.string().optional().describe('Postal code'),
            country: z.string().optional().describe('Country'),
            phone: z.string().optional().describe('Phone number'),
            website: z.string().optional().describe('Website URL'),
            openingHours: z.string().optional().describe('Opening hours'),
            distance: z.number().optional().describe('Distance from bias point in meters')
          })
        )
        .describe('Found places')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.searchPlaces({
      categories: ctx.input.categories,
      filter: ctx.input.filter,
      bias: ctx.input.bias,
      conditions: ctx.input.conditions,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      lang: ctx.input.lang,
      name: ctx.input.name
    });

    let places = (data.features || []).map((f: any) => {
      let p = f.properties || {};
      let coords = f.geometry?.coordinates || [];
      return {
        placeId: p.place_id,
        name: p.name,
        categories: p.categories,
        lat: coords[1],
        lon: coords[0],
        formatted: p.formatted,
        street: p.street,
        housenumber: p.housenumber,
        city: p.city,
        state: p.state,
        postcode: p.postcode,
        country: p.country,
        phone: p.contact?.phone,
        website: p.website || p.contact?.website,
        openingHours: p.opening_hours,
        distance: p.distance
      };
    });

    return {
      output: { places },
      message: `Found **${places.length}** place(s) matching categories "${ctx.input.categories}"`
    };
  })
  .build();
