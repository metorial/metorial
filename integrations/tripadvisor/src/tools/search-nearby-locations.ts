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

let nearbyLocationSchema = z.object({
  locationId: z.string(),
  name: z.string(),
  distance: z.string().optional(),
  bearing: z.string().optional(),
  address: addressSchema
});

export let searchNearbyLocations = SlateTool.create(spec, {
  name: 'Search Nearby Locations',
  key: 'search_nearby_locations',
  description: `Find hotels, restaurants, and attractions near a specific geographic point. Provide latitude and longitude coordinates to discover nearby locations. Results include distance and bearing from the search point. Optionally filter by category and set a search radius.`,
  constraints: [
    'Returns a maximum of 10 results.',
    'Requires latitude and longitude coordinates.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latLong: z.string().describe('Latitude/longitude pair (e.g., "42.3455,-71.10767")'),
      category: z
        .enum(['hotels', 'attractions', 'restaurants', 'geos'])
        .optional()
        .describe('Filter results by location type'),
      phone: z
        .string()
        .optional()
        .describe('Phone number to narrow results (any format, no "+" prefix)'),
      address: z.string().optional().describe('Address to narrow results'),
      radius: z.number().optional().describe('Search radius distance (must be > 0)'),
      radiusUnit: z.enum(['km', 'mi', 'm']).optional().describe('Unit for the search radius'),
      language: z
        .string()
        .optional()
        .describe('Language code for results (overrides global config)')
    })
  )
  .output(
    z.object({
      locations: z.array(nearbyLocationSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ContentClient({
      token: ctx.auth.token,
      language: ctx.config.language,
      currency: ctx.config.currency
    });

    let result = await client.searchNearbyLocations({
      latLong: ctx.input.latLong,
      category: ctx.input.category,
      phone: ctx.input.phone,
      address: ctx.input.address,
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
      message: `Found **${locations.length}** location(s) near coordinates ${ctx.input.latLong}${ctx.input.category ? ` (${ctx.input.category})` : ''}.`
    };
  })
  .build();
