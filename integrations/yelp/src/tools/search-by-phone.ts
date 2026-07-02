import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { businessSchema, mapBusiness } from './search-businesses';

export let searchByPhone = SlateTool.create(spec, {
  name: 'Search by Phone',
  key: 'search_by_phone',
  description: `Find Yelp businesses by phone number. Useful for looking up a specific business when you have its phone number. Multiple businesses may share the same phone number (e.g., chain stores or businesses in the same building).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe('Phone number with country code prefix (e.g., "+14157492060")'),
      locale: z.string().optional().describe('Locale code (e.g., "en_US")')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching businesses'),
      businesses: z.array(businessSchema).describe('Matching businesses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchByPhone(ctx.input.phone, ctx.input.locale);

    let businesses = (result.businesses || []).map(mapBusiness);

    return {
      output: {
        total: result.total,
        businesses
      },
      message:
        businesses.length > 0
          ? `Found **${result.total}** business(es) matching phone number ${ctx.input.phone}. Top result: **${businesses[0].name}**`
          : `No businesses found for phone number ${ctx.input.phone}.`
    };
  })
  .build();
