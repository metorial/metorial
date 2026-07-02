import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

let productSchema = z.object({
  productId: z.string().describe('Unique product ID'),
  name: z.string().describe('Product name'),
  permalink: z.string().optional().describe('Product permalink/slug'),
  description: z.string().optional().describe('Product description'),
  published: z.boolean().optional().describe('Whether the product is published'),
  priceCents: z.number().optional().describe('Product price in cents'),
  currency: z.string().optional().describe('Currency code'),
  url: z.string().optional().describe('Gumroad product URL'),
  shortUrl: z.string().optional().describe('Short URL for the product'),
  salesCount: z.number().optional().describe('Total number of sales'),
  salesUsdCents: z.number().optional().describe('Total sales revenue in USD cents')
});

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Retrieve all products from your Gumroad account. Returns product details including name, price, sales count, and publish status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      products: z.array(productSchema).describe('List of products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let products = await client.listProducts();

    let mapped = products.map((p: any) => ({
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
      salesUsdCents: p.sales_usd_cents
    }));

    return {
      output: { products: mapped },
      message: `Found **${mapped.length}** product(s).`
    };
  })
  .build();
