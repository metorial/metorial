import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

let placeResultSchema = z.object({
  title: z.string().optional().describe('Place name or title'),
  hereId: z.string().optional().describe('HERE place ID for use with the lookup tool'),
  resultType: z.string().optional().describe('Result type (e.g. place, street, locality)'),
  categories: z
    .array(
      z.object({
        categoryId: z.string().optional(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Place categories'),
  address: z
    .object({
      label: z.string().optional(),
      countryCode: z.string().optional(),
      countryName: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      district: z.string().optional(),
      street: z.string().optional(),
      postalCode: z.string().optional(),
      houseNumber: z.string().optional()
    })
    .optional()
    .describe('Address of the place'),
  position: z
    .object({
      lat: z.number(),
      lng: z.number()
    })
    .optional()
    .describe('Geographic coordinates'),
  distance: z.number().optional().describe('Distance from search center in meters'),
  contacts: z
    .array(
      z.object({
        phone: z.array(z.object({ value: z.string().optional() })).optional(),
        www: z.array(z.object({ value: z.string().optional() })).optional()
      })
    )
    .optional()
    .describe('Contact information'),
  openingHours: z
    .array(
      z.object({
        text: z.array(z.string()).optional(),
        isOpen: z.boolean().optional()
      })
    )
    .optional()
    .describe('Opening hours')
});

export let searchPlaces = SlateTool.create(spec, {
  name: 'Search Places',
  key: 'search_places',
  description: `Search for places, businesses, and points of interest (POIs) near a location. Supports two modes:
- **Discover**: Free-text search (e.g. "coffee shop", "hotels near Central Park")
- **Browse**: Structured category-based search (e.g. restaurants, gas stations) using HERE category IDs

Returns place names, addresses, coordinates, categories, contacts, and opening hours.`,
  instructions: [
    'Use "query" for free-text discovery searches like "pizza near me" or "hotel in Paris".',
    'Use "categories" without a query for structured browsing by HERE category IDs (e.g. "100-1000-0000" for restaurants).',
    'Either "at" or "inArea" must be provided to establish the search location.',
    'Use "name" with "categories" to filter places by name within a category.'
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
        .describe(
          'Free-text search query (e.g. "coffee shop", "pizza restaurant"). Triggers discover mode.'
        ),
      at: z.string().describe('Search center as "lat,lng" (e.g. "52.5308,13.3847")'),
      categories: z
        .string()
        .optional()
        .describe(
          'HERE place category IDs, comma-separated (e.g. "100-1000-0009"). Triggers browse mode when no query given.'
        ),
      foodTypes: z
        .string()
        .optional()
        .describe('Cuisine type IDs for browse mode, comma-separated (e.g. "202,208")'),
      chains: z
        .string()
        .optional()
        .describe('HERE chain IDs for browse mode, comma-separated'),
      name: z.string().optional().describe('Filter by place name in browse mode'),
      inArea: z
        .string()
        .optional()
        .describe(
          'Geographic filter (e.g. "countryCode:USA", "circle:lat,lng;r=5000", "bbox:w,s,e,n")'
        ),
      limit: z.number().optional().describe('Maximum number of results (default 20)'),
      lang: z.string().optional().describe('BCP 47 language code (e.g. "en-US")')
    })
  )
  .output(
    z.object({
      results: z.array(placeResultSchema).describe('Place search results'),
      searchMode: z.string().describe('Search mode used: "discover" or "browse"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let response: any;
    let searchMode: string;

    if (ctx.input.query) {
      searchMode = 'discover';
      response = await client.discover({
        query: ctx.input.query,
        at: ctx.input.at,
        inArea: ctx.input.inArea,
        limit: ctx.input.limit,
        lang: ctx.input.lang
      });
    } else {
      searchMode = 'browse';
      response = await client.browse({
        at: ctx.input.at,
        categories: ctx.input.categories,
        foodTypes: ctx.input.foodTypes,
        chains: ctx.input.chains,
        name: ctx.input.name,
        inArea: ctx.input.inArea,
        limit: ctx.input.limit,
        lang: ctx.input.lang
      });
    }

    let items = response.items || [];
    let results = items.map((item: any) => ({
      title: item.title,
      hereId: item.id,
      resultType: item.resultType,
      categories: item.categories?.map((c: any) => ({ categoryId: c.id, name: c.name })),
      address: item.address,
      position: item.position,
      distance: item.distance,
      contacts: item.contacts,
      openingHours: item.openingHours
    }));

    return {
      output: { results, searchMode },
      message:
        results.length > 0
          ? `Found **${results.length}** place(s) via **${searchMode}** mode. Top result: **${results[0].title}**`
          : `No places found matching the search criteria.`
    };
  })
  .build();
