import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let reverseGeocode = SlateTool.create(spec, {
  name: 'Reverse Geocode',
  key: 'reverse_geocode',
  description: `Convert geographic coordinates (latitude/longitude) into a structured address. Returns the nearest address to the given coordinates, including street, city, state, country, and postal code.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().describe('Latitude of the location'),
      lon: z.number().describe('Longitude of the location'),
      type: z
        .enum(['country', 'state', 'city', 'postcode', 'street', 'amenity'])
        .optional()
        .describe('Address level to return'),
      lang: z.string().optional().describe('ISO 639-1 language code for results'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            placeId: z.string().optional().describe('Unique place identifier'),
            formatted: z.string().optional().describe('Full formatted address'),
            addressLine1: z.string().optional().describe('First address line'),
            addressLine2: z.string().optional().describe('Second address line'),
            lat: z.number().describe('Latitude'),
            lon: z.number().describe('Longitude'),
            housenumber: z.string().optional().describe('House number'),
            street: z.string().optional().describe('Street name'),
            city: z.string().optional().describe('City name'),
            county: z.string().optional().describe('County name'),
            state: z.string().optional().describe('State or region name'),
            postcode: z.string().optional().describe('Postal code'),
            country: z.string().optional().describe('Country name'),
            countryCode: z.string().optional().describe('ISO country code'),
            resultType: z.string().optional().describe('Result type'),
            distance: z
              .number()
              .optional()
              .describe('Distance in meters from queried coordinates to nearest address')
          })
        )
        .describe('Reverse geocoding results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.geocodeReverse({
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      type: ctx.input.type,
      lang: ctx.input.lang,
      limit: ctx.input.limit
    });

    let results = (data.results || []).map((r: any) => ({
      placeId: r.place_id,
      formatted: r.formatted,
      addressLine1: r.address_line1,
      addressLine2: r.address_line2,
      lat: r.lat,
      lon: r.lon,
      housenumber: r.housenumber,
      street: r.street,
      city: r.city,
      county: r.county,
      state: r.state,
      postcode: r.postcode,
      country: r.country,
      countryCode: r.country_code,
      resultType: r.result_type,
      distance: r.distance
    }));

    let count = results.length;
    let firstResult = count > 0 ? results[0].formatted : 'no results';
    return {
      output: { results },
      message: `Found **${count}** result(s) for coordinates (${ctx.input.lat}, ${ctx.input.lon}). Top result: ${firstResult}`
    };
  })
  .build();
