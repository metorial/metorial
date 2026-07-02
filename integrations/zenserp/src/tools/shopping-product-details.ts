import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productDetailSchema = z
  .object({
    productId: z.string().optional().describe('Product ID'),
    title: z.string().optional().describe('Product title'),
    prices: z
      .array(z.record(z.string(), z.any()))
      .optional()
      .describe('Prices from different sellers'),
    description: z.string().optional().describe('Product description'),
    features: z.array(z.string()).optional().describe('Product features'),
    reviews: z.array(z.record(z.string(), z.any())).optional().describe('Product reviews'),
    specifications: z.record(z.string(), z.any()).optional().describe('Product specifications')
  })
  .passthrough();

export let shoppingProductDetails = SlateTool.create(spec, {
  name: 'Get Shopping Product Details',
  key: 'shopping_product_details',
  description: `Retrieve detailed information for a specific shopping product using its product ID (obtained from the Shopping Search tool). Returns pricing from multiple sellers, descriptions, features, reviews, and specifications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('Product ID obtained from a shopping search result'),
      location: z.string().optional().describe('Location for geotargeted pricing'),
      language: z.string().optional().describe('Language code (hl), e.g. "en"'),
      country: z.string().optional().describe('Country code (gl), e.g. "us"')
    })
  )
  .output(productDetailSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getShoppingDetails({
      productId: ctx.input.productId,
      location: ctx.input.location,
      hl: ctx.input.language,
      gl: ctx.input.country
    });

    return {
      output: {
        productId: ctx.input.productId,
        ...results
      },
      message: `Retrieved product details for product ID **${ctx.input.productId}**.`
    };
  })
  .build();
