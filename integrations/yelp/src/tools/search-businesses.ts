import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z.object({
  alias: z.string().describe('Category alias identifier'),
  title: z.string().describe('Display title of the category')
});

let coordinatesSchema = z.object({
  latitude: z.number().nullable().optional().describe('Latitude'),
  longitude: z.number().nullable().optional().describe('Longitude')
});

let locationSchema = z.object({
  address1: z.string().nullable().optional().describe('Street address'),
  address2: z.string().nullable().optional().describe('Second line of address'),
  address3: z.string().nullable().optional().describe('Third line of address'),
  city: z.string().nullable().optional().describe('City'),
  zipCode: z.string().nullable().optional().describe('Zip code'),
  country: z.string().nullable().optional().describe('Country code'),
  state: z.string().nullable().optional().describe('State code'),
  displayAddress: z.array(z.string()).optional().describe('Formatted display address lines')
});

let businessSchema = z.object({
  businessId: z.string().describe('Unique Yelp business ID'),
  alias: z.string().describe('Business alias for URL-friendly identification'),
  name: z.string().describe('Business name'),
  imageUrl: z.string().optional().describe('URL of the business photo'),
  isClosed: z.boolean().optional().describe('Whether the business has permanently closed'),
  url: z.string().optional().describe('Yelp URL for the business'),
  reviewCount: z.number().optional().describe('Number of reviews'),
  categories: z.array(categorySchema).optional().describe('Business categories'),
  rating: z.number().optional().describe('Yelp rating (1-5)'),
  coordinates: coordinatesSchema.optional().describe('Business coordinates'),
  transactions: z
    .array(z.string())
    .optional()
    .describe('Supported transactions (e.g., delivery, pickup)'),
  price: z.string().optional().describe('Price level ($ to $$$$)'),
  location: locationSchema.optional().describe('Business location'),
  phone: z.string().optional().describe('Phone number in E.164 format'),
  displayPhone: z.string().optional().describe('Formatted phone number'),
  distance: z.number().optional().describe('Distance from search location in meters')
});

let mapBusiness = (b: any) => ({
  businessId: b.id,
  alias: b.alias,
  name: b.name,
  imageUrl: b.image_url,
  isClosed: b.is_closed,
  url: b.url,
  reviewCount: b.review_count,
  categories: b.categories,
  rating: b.rating,
  coordinates: b.coordinates,
  transactions: b.transactions,
  price: b.price,
  location: b.location
    ? {
        address1: b.location.address1,
        address2: b.location.address2,
        address3: b.location.address3,
        city: b.location.city,
        zipCode: b.location.zip_code,
        country: b.location.country,
        state: b.location.state,
        displayAddress: b.location.display_address
      }
    : undefined,
  phone: b.phone,
  displayPhone: b.display_phone,
  distance: b.distance
});

export { businessSchema, categorySchema, coordinatesSchema, locationSchema, mapBusiness };

export let searchBusinesses = SlateTool.create(spec, {
  name: 'Search Businesses',
  key: 'search_businesses',
  description: `Search for businesses on Yelp by keyword, category, location, price level, and more. Supports searching by text query with location (address or coordinates), filtering by price, open status, and business attributes. Results are sorted by best match by default but can be sorted by rating, review count, or distance.`,
  constraints: [
    'Requires either location (address) or latitude/longitude coordinates.',
    'Maximum 50 results per request, up to 240 total results via pagination.',
    'Businesses with zero reviews are not included in results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      term: z
        .string()
        .optional()
        .describe('Search keyword (e.g., "food", "restaurants", "pizza")'),
      location: z
        .string()
        .optional()
        .describe(
          'Address, city, state, or zip code. Required if latitude/longitude not provided.'
        ),
      latitude: z
        .number()
        .optional()
        .describe('Latitude coordinate. Required if location not provided.'),
      longitude: z
        .number()
        .optional()
        .describe('Longitude coordinate. Required if location not provided.'),
      radius: z.number().optional().describe('Search radius in meters (max 40000)'),
      categories: z
        .string()
        .optional()
        .describe('Comma-delimited category aliases (e.g., "bars,french")'),
      locale: z.string().optional().describe('Locale code (e.g., "en_US")'),
      limit: z.number().optional().describe('Number of results to return (1-50, default 20)'),
      offset: z.number().optional().describe('Offset for pagination'),
      sortBy: z
        .enum(['best_match', 'rating', 'review_count', 'distance'])
        .optional()
        .describe('Sort order for results'),
      price: z
        .string()
        .optional()
        .describe('Comma-delimited price levels to filter by (e.g., "1,2" for $ and $$)'),
      openNow: z.boolean().optional().describe('Filter for currently-open businesses'),
      openAt: z
        .number()
        .optional()
        .describe('Unix timestamp to filter businesses open at that time'),
      attributes: z
        .string()
        .optional()
        .describe(
          'Comma-delimited attributes (e.g., "hot_and_new,reservation,wheelchair_accessible")'
        )
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching businesses'),
      businesses: z.array(businessSchema).describe('List of matching businesses'),
      region: z
        .object({
          center: coordinatesSchema.optional()
        })
        .optional()
        .describe('Center of the search region')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchBusinesses({
      term: ctx.input.term,
      location: ctx.input.location,
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      radius: ctx.input.radius,
      categories: ctx.input.categories,
      locale: ctx.input.locale,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sortBy: ctx.input.sortBy,
      price: ctx.input.price,
      openNow: ctx.input.openNow,
      openAt: ctx.input.openAt,
      attributes: ctx.input.attributes
    });

    let businesses = (result.businesses || []).map(mapBusiness);

    return {
      output: {
        total: result.total,
        businesses,
        region: result.region
      },
      message: `Found **${result.total}** businesses${ctx.input.term ? ` matching "${ctx.input.term}"` : ''}${ctx.input.location ? ` near ${ctx.input.location}` : ''}. Returned ${businesses.length} results.`
    };
  })
  .build();
