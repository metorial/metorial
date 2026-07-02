import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let autocomplete = SlateTool.create(spec, {
  name: 'Autocomplete',
  key: 'autocomplete',
  description: `Get real-time autocomplete suggestions as users type. Returns suggestions for search terms, businesses, and categories. Providing location coordinates improves suggestion relevance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      text: z.string().describe('Text to get autocomplete suggestions for'),
      latitude: z
        .number()
        .optional()
        .describe('Latitude for location-based suggestion relevance'),
      longitude: z
        .number()
        .optional()
        .describe('Longitude for location-based suggestion relevance'),
      locale: z.string().optional().describe('Locale code (e.g., "en_US")')
    })
  )
  .output(
    z.object({
      terms: z
        .array(
          z.object({
            text: z.string().describe('Suggested search term')
          })
        )
        .describe('Autocomplete term suggestions'),
      businesses: z
        .array(
          z.object({
            businessId: z.string().describe('Yelp business ID'),
            name: z.string().describe('Business name')
          })
        )
        .describe('Autocomplete business suggestions'),
      categories: z
        .array(
          z.object({
            alias: z.string().describe('Category alias identifier'),
            title: z.string().describe('Display title of the category')
          })
        )
        .describe('Autocomplete category suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.autocomplete(ctx.input.text, {
      latitude: ctx.input.latitude,
      longitude: ctx.input.longitude,
      locale: ctx.input.locale
    });

    let businesses = (result.businesses || []).map((b: any) => ({
      businessId: b.id,
      name: b.name
    }));

    let terms = result.terms || [];
    let categories = result.categories || [];

    return {
      output: {
        terms,
        businesses,
        categories
      },
      message: `Autocomplete for "${ctx.input.text}": ${terms.length} terms, ${businesses.length} businesses, ${categories.length} categories.`
    };
  })
  .build();
