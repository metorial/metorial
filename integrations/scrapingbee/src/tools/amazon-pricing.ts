import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let amazonPricing = SlateTool.create(spec, {
  name: 'Get Amazon Offer Pricing',
  key: 'amazon_pricing',
  description:
    'Retrieve current pricing and seller offers for an Amazon product by ASIN. Use amazon_search to discover product ASINs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      asin: z.string().min(1).describe('Product ASIN returned by amazon_search'),
      domain: z
        .string()
        .optional()
        .describe('Amazon marketplace, such as com, co.uk, de, or amazon.com'),
      language: z.string().optional().describe('ISO language code for the results'),
      countryCode: z
        .string()
        .optional()
        .describe(
          'Two-letter geolocation country code. Omit when it matches the selected Amazon marketplace country.'
        ),
      currency: z.string().optional().describe('ISO 4217 currency code, such as USD or EUR')
    })
  )
  .output(z.object({ asin: z.string(), results: z.any() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.amazonPricing(ctx.input);
    return {
      output: { asin: ctx.input.asin, results },
      message: `Retrieved Amazon pricing for ASIN **${ctx.input.asin}**.`
    };
  });
