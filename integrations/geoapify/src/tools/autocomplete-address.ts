import { SlateTool } from 'slates';
import { z } from 'zod';
import { GeoapifyClient } from '../lib/client';
import { spec } from '../spec';

export let autocompleteAddress = SlateTool.create(spec, {
  name: 'Autocomplete Address',
  key: 'autocomplete_address',
  description: `Get address suggestions for a partial address string. Designed for type-ahead address input — provide a partial address and receive ranked completion suggestions with coordinates and structured address data.`,
  instructions: [
    'Provide at least a partial address string in the text field.',
    'Use filter and bias to constrain or prioritize results geographically.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('Partial address string to autocomplete'),
      type: z
        .enum(['country', 'state', 'city', 'postcode', 'street', 'amenity'])
        .optional()
        .describe('Filter suggestions by location type'),
      lang: z.string().optional().describe('ISO 639-1 language code for results'),
      limit: z.number().optional().describe('Maximum number of suggestions'),
      filter: z
        .string()
        .optional()
        .describe('Geographic filter constraint (e.g. "countrycode:us")'),
      bias: z
        .string()
        .optional()
        .describe('Geographic proximity bias (e.g. "proximity:lon,lat")')
    })
  )
  .output(
    z.object({
      suggestions: z
        .array(
          z.object({
            placeId: z.string().optional().describe('Unique place identifier'),
            formatted: z.string().optional().describe('Full formatted address'),
            addressLine1: z.string().optional().describe('First address line'),
            addressLine2: z.string().optional().describe('Second address line'),
            lat: z.number().optional().describe('Latitude'),
            lon: z.number().optional().describe('Longitude'),
            city: z.string().optional().describe('City name'),
            state: z.string().optional().describe('State or region'),
            country: z.string().optional().describe('Country name'),
            countryCode: z.string().optional().describe('ISO country code'),
            postcode: z.string().optional().describe('Postal code'),
            resultType: z.string().optional().describe('Result type')
          })
        )
        .describe('Autocomplete suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GeoapifyClient({ token: ctx.auth.token });

    let data = await client.autocomplete({
      text: ctx.input.text,
      type: ctx.input.type,
      lang: ctx.input.lang,
      limit: ctx.input.limit,
      filter: ctx.input.filter,
      bias: ctx.input.bias
    });

    let suggestions = (data.results || []).map((r: any) => ({
      placeId: r.place_id,
      formatted: r.formatted,
      addressLine1: r.address_line1,
      addressLine2: r.address_line2,
      lat: r.lat,
      lon: r.lon,
      city: r.city,
      state: r.state,
      country: r.country,
      countryCode: r.country_code,
      postcode: r.postcode,
      resultType: r.result_type
    }));

    return {
      output: { suggestions },
      message: `Found **${suggestions.length}** suggestion(s) for "${ctx.input.text}"`
    };
  })
  .build();
