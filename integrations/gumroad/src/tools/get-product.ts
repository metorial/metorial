import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a specific Gumroad product, including variant categories, custom fields, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('The product ID to retrieve')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('Unique product ID'),
      name: z.string().describe('Product name'),
      permalink: z.string().optional().describe('Product permalink'),
      description: z.string().optional().describe('Product description in HTML'),
      published: z.boolean().optional().describe('Whether the product is published'),
      priceCents: z.number().optional().describe('Product price in cents'),
      currency: z.string().optional().describe('Currency code'),
      url: z.string().optional().describe('Gumroad product URL'),
      shortUrl: z.string().optional().describe('Short URL for the product'),
      salesCount: z.number().optional().describe('Total number of sales'),
      salesUsdCents: z.number().optional().describe('Total sales revenue in USD cents'),
      tags: z.array(z.string()).optional().describe('Product tags'),
      customFields: z
        .array(z.any())
        .optional()
        .describe('Custom fields configured on the product'),
      variantCategories: z
        .array(z.any())
        .optional()
        .describe('Variant categories and their options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let p = await client.getProduct(ctx.input.productId);

    return {
      output: {
        productId: p.id,
        name: p.name || '',
        permalink: p.permalink || undefined,
        description: p.description || undefined,
        published: p.published,
        priceCents: p.price,
        currency: p.currency,
        url: p.url || undefined,
        shortUrl: p.short_url || undefined,
        salesCount: p.sales_count,
        salesUsdCents: p.sales_usd_cents,
        tags: p.tags || undefined,
        customFields: p.custom_fields || undefined,
        variantCategories: p.variant_categories || undefined
      },
      message: `Retrieved product **${p.name}** (${p.id}).`
    };
  })
  .build();
