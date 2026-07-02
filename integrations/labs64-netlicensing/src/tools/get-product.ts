import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product',
  key: 'get_product',
  description: `Retrieve a single product by its number. Returns complete product details including name, version, active status, and licensing configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productNumber: z.string().describe('Unique product identifier')
    })
  )
  .output(
    z.object({
      productNumber: z.string().describe('Unique product identifier'),
      name: z.string().optional().describe('Product name'),
      active: z.boolean().optional().describe('Whether the product is active'),
      version: z.string().optional().describe('Product version'),
      description: z.string().optional().describe('Product description'),
      licensingInfo: z.string().optional().describe('Licensing information'),
      licenseeAutoCreate: z.boolean().optional().describe('Whether licensees are auto-created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getProduct(ctx.input.productNumber);
    if (!result) throw new Error(`Product ${ctx.input.productNumber} not found`);
    return {
      output: {
        productNumber: result.number,
        name: result.name,
        active: result.active,
        version: result.version,
        description: result.description,
        licensingInfo: result.licensingInfo,
        licenseeAutoCreate: result.licenseeAutoCreate
      },
      message: `Product **${result.number}** (${result.name}) retrieved.`
    };
  })
  .build();
