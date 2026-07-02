import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve detailed information about a single product by its ID. Can include sub-resources like variants, images, custom fields, modifiers, and options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.number().describe('The ID of the product to retrieve'),
      include: z
        .array(
          z.enum([
            'variants',
            'images',
            'custom_fields',
            'bulk_pricing_rules',
            'primary_image',
            'modifiers',
            'options',
            'videos'
          ])
        )
        .optional()
        .describe('Sub-resources to include in the response')
    })
  )
  .output(
    z.object({
      product: z.any().describe('The product object with all details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let params: Record<string, any> = {};
    if (ctx.input.include?.length) params.include = ctx.input.include.join(',');

    let result = await client.getProduct(ctx.input.productId, params);

    return {
      output: {
        product: result.data
      },
      message: `Retrieved product **${result.data.name}** (ID: ${result.data.id}).`
    };
  })
  .build();
