import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productResultSchema = z.object({
  title: z.string().optional().describe('Product title'),
  link: z.string().optional().describe('Product URL'),
  asin: z.string().optional().describe('Amazon Standard Identification Number'),
  price: z.string().optional().describe('Current product price'),
  imageUrl: z.string().optional().describe('Product image URL'),
  rating: z.number().optional().describe('Product rating'),
  reviewCount: z.number().optional().describe('Number of reviews'),
  position: z.number().optional().describe('Position in search results'),
  isPrime: z.boolean().optional().describe('Whether the product is Prime eligible'),
  isBestseller: z.boolean().optional().describe('Whether the product is a bestseller'),
  isSponsored: z.boolean().optional().describe('Whether the product listing is sponsored')
});

export let productSearch = SlateTool.create(spec, {
  name: 'Product Search',
  key: 'product_search',
  description: `Search for products and retrieve structured product listings. Returns product data including titles, prices, ratings, reviews, images, and availability from major e-commerce sources. Useful for building price comparison tools, product research, or monitoring product availability.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Product search query (e.g., "iphone 14", "wireless headphones")'),
      proxyLocation: z
        .enum([
          'US',
          'EU',
          'CA',
          'GB',
          'FR',
          'DE',
          'SE',
          'IE',
          'IN',
          'JP',
          'KR',
          'SG',
          'AU',
          'BR'
        ])
        .optional()
        .describe('Geographic location for geo-targeted results, overrides default'),
      deviceType: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type for results, overrides default')
    })
  )
  .output(
    z.object({
      products: z.array(productResultSchema).describe('Product listings'),
      ads: z.array(z.any()).optional().describe('Product advertisements')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      proxyLocation: ctx.config.proxyLocation,
      deviceType: ctx.config.deviceType
    });

    let data = await client.productSearch({
      query: ctx.input.query,
      proxyLocation: ctx.input.proxyLocation,
      deviceType: ctx.input.deviceType
    });

    let products = data.products || [];

    return {
      output: {
        products,
        ads: data.ads || []
      },
      message: `Found **${products.length}** products for "${ctx.input.query}".`
    };
  })
  .build();
