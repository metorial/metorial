import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let matchBusiness = SlateTool.create(spec, {
  name: 'Match Business',
  key: 'match_business',
  description: `Find the Yelp business ID for a known business by matching on name, address, and other attributes. Use this when you have a business's real-world information and need to find its corresponding Yelp entry.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Business name'),
      address1: z.string().describe('First line of street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State or province code'),
      country: z.string().describe('ISO 3166-1 alpha-2 country code (e.g., "US")'),
      address2: z.string().optional().describe('Second line of address'),
      address3: z.string().optional().describe('Third line of address'),
      zipCode: z.string().optional().describe('Zip or postal code'),
      phone: z
        .string()
        .optional()
        .describe('Phone number with country code (e.g., "+14157492060")'),
      latitude: z.number().optional().describe('Latitude coordinate'),
      longitude: z.number().optional().describe('Longitude coordinate'),
      limit: z.number().optional().describe('Maximum number of matches to return'),
      matchThreshold: z
        .enum(['default', 'none'])
        .optional()
        .describe(
          '"default" for confident matches only, "none" to return all possible matches'
        )
    })
  )
  .output(
    z.object({
      businesses: z
        .array(
          z.object({
            businessId: z.string().describe('Yelp business ID'),
            alias: z.string().optional().describe('Business alias'),
            name: z.string().describe('Business name'),
            phone: z.string().optional().describe('Phone number'),
            location: z
              .object({
                address1: z.string().nullable().optional(),
                city: z.string().nullable().optional(),
                state: z.string().nullable().optional(),
                zipCode: z.string().nullable().optional(),
                country: z.string().nullable().optional()
              })
              .optional()
              .describe('Business location'),
            coordinates: z
              .object({
                latitude: z.number().nullable().optional(),
                longitude: z.number().nullable().optional()
              })
              .optional()
              .describe('Business coordinates')
          })
        )
        .describe('Matched businesses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.matchBusiness({
      name: ctx.input.name,
      address1: ctx.input.address1,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country,
      address2: ctx.input.address2,
      address3: ctx.input.address3,
      zipCode: ctx.input.zipCode,
      phone: ctx.input.phone,
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      limit: ctx.input.limit,
      matchThreshold: ctx.input.matchThreshold
    });

    let businesses = (result.businesses || []).map((b: any) => ({
      businessId: b.id,
      alias: b.alias,
      name: b.name,
      phone: b.phone,
      location: b.location
        ? {
            address1: b.location.address1,
            city: b.location.city,
            state: b.location.state,
            zipCode: b.location.zip_code,
            country: b.location.country
          }
        : undefined,
      coordinates: b.coordinates
    }));

    return {
      output: {
        businesses
      },
      message:
        businesses.length > 0
          ? `Found **${businesses.length}** match(es) for "${ctx.input.name}". Top match: **${businesses[0].name}** (ID: ${businesses[0].businessId})`
          : `No matches found for "${ctx.input.name}" at the specified address.`
    };
  })
  .build();
