import { SlateTool } from 'slates';
import { z } from 'zod';
import { BestBuyClient } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information for a single Best Buy product by its SKU. Returns full product details including pricing, availability, specifications, descriptions, images, and reviews.`,
  instructions: ['Use the show field to limit returned fields for faster responses.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sku: z.string().describe('The Best Buy product SKU number'),
      show: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return, e.g. "sku,name,salePrice,regularPrice,description,manufacturer"'
        )
    })
  )
  .output(
    z.object({
      product: z
        .record(z.string(), z.unknown())
        .describe('Product details with all requested fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BestBuyClient({ token: ctx.auth.token });

    let product = await client.getProduct(ctx.input.sku, ctx.input.show);

    let productName = (product as Record<string, unknown>).name || ctx.input.sku;
    return {
      output: {
        product
      },
      message: `Retrieved product details for **${productName}** (SKU: ${ctx.input.sku}).`
    };
  })
  .build();
