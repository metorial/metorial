import { SlateTool } from 'slates';
import { z } from 'zod';
import { ContentClient } from '../lib/client';
import { spec } from '../spec';

let mappedLocationSchema = z.object({
  locationId: z.string(),
  name: z.string(),
  distance: z.string().optional(),
  bearing: z.string().optional(),
  address: z
    .object({
      street1: z.string().optional(),
      street2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalcode: z.string().optional(),
      addressString: z.string().optional()
    })
    .optional()
});

export let mapLocation = SlateTool.create(spec, {
  name: 'Map Location ID',
  key: 'map_location',
  description: `Map an external property to its Tripadvisor location ID using geographic coordinates and property name. Useful for matching your own hotel/restaurant/attraction records to Tripadvisor listings. Provide the property name and coordinates for best results. Uses the Tripadvisor location mapper API with automatic "-mapper" key suffix.`,
  instructions: [
    'Use the exact property name for the query parameter for best matching accuracy.',
    'There is no auto-correction, so correct spelling is important.'
  ],
  constraints: ['Processes one location at a time.', 'Up to 25,000 mapper calls per day.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      latitude: z.number().describe('Latitude of the property'),
      longitude: z.number().describe('Longitude of the property'),
      query: z
        .string()
        .describe('Property name to search for (use exact name for best results)'),
      category: z.enum(['hotels', 'attractions', 'restaurants']).describe('Property type')
    })
  )
  .output(
    z.object({
      locations: z.array(mappedLocationSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ContentClient({
      token: ctx.auth.token,
      language: ctx.config.language,
      currency: ctx.config.currency
    });

    let result = await client.mapLocation({
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      query: ctx.input.query,
      category: ctx.input.category
    });

    let locations = (result.data || []).map((loc: any) => ({
      locationId: String(loc.location_id),
      name: loc.name,
      distance: loc.distance ? String(loc.distance) : undefined,
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
      message: `Found **${locations.length}** matching location(s) for "${ctx.input.query}" near (${ctx.input.latitude}, ${ctx.input.longitude}).`
    };
  })
  .build();
