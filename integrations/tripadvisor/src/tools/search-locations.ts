import { SlateTool } from 'slates';
import { z } from 'zod';
import { ContentClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    street1: z.string().optional(),
    street2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postalcode: z.string().optional(),
    addressString: z.string().optional()
  })
  .optional();

let locationResultSchema = z.object({
  locationId: z.string(),
  name: z.string(),
  distance: z.string().optional(),
  bearing: z.string().optional(),
  address: addressSchema
});

export let searchLocations = SlateTool.create(spec, {
  name: 'Search Locations',
  key: 'search_locations',
  description: `Search for hotels, restaurants, attractions, and geographic locations on Tripadvisor by keyword. Returns up to 10 matching locations with basic info including name, address, and location ID. Optionally filter by category or refine with coordinates, phone number, or address. Use the returned location IDs with other tools to get details, reviews, or photos.`,
  constraints: [
    'Returns a maximum of 10 results per search.',
    'Up to 10,000 search calls per day.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z
        .string()
        .describe(
          'Text to search for (e.g., "Eiffel Tower", "Bora Bora", "The French Laundry")'
        ),
      category: z
        .enum(['hotels', 'attractions', 'restaurants', 'geos'])
        .optional()
        .describe('Filter results by location type'),
      phone: z
        .string()
        .optional()
        .describe('Phone number to narrow results (any format, no "+" prefix)'),
      address: z.string().optional().describe('Address to narrow results'),
      latLong: z
        .string()
        .optional()
        .describe('Latitude/longitude pair to scope search (e.g., "42.3455,-71.10767")'),
      radius: z
        .number()
        .optional()
        .describe('Search radius distance from the latLong point (must be > 0)'),
      radiusUnit: z.enum(['km', 'mi', 'm']).optional().describe('Unit for the search radius'),
      language: z
        .string()
        .optional()
        .describe('Language code for results (overrides global config)')
    })
  )
  .output(
    z.object({
      locations: z.array(locationResultSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ContentClient({
      token: ctx.auth.token,
      language: ctx.config.language,
      currency: ctx.config.currency
    });

    let result = await client.searchLocations({
      searchQuery: ctx.input.searchQuery,
      category: ctx.input.category,
      phone: ctx.input.phone,
      address: ctx.input.address,
      latLong: ctx.input.latLong,
      radius: ctx.input.radius,
      radiusUnit: ctx.input.radiusUnit,
      language: ctx.input.language
    });

    let locations = (result.data || []).map((loc: any) => ({
      locationId: String(loc.location_id),
      name: loc.name,
      distance: loc.distance,
      bearing: loc.bearing,
      address: loc.address_obj
        ? {
            street1: loc.address_obj.street1,
            street2: loc.address_obj.street2,
            city: loc.address_obj.city,
            state: loc.address_obj.state,
            country: loc.address_obj.country,
            postalcode: loc.address_obj.postalcode,
            addressString: loc.address_obj.address_string
          }
        : undefined
    }));

    return {
      output: { locations },
      message: `Found **${locations.length}** location(s) for "${ctx.input.searchQuery}"${ctx.input.category ? ` in category "${ctx.input.category}"` : ''}.`
    };
  })
  .build();
