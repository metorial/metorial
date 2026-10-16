import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in Altoviz. Provide a name and product number, along with optional pricing and description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Product name'),
      number: z.string().describe('Product number (unique identifier)'),
      description: z.string().optional().describe('Product description'),
      purchasePrice: z.number().optional().describe('Purchase price'),
      taxExcludedPrice: z
        .number()
        .optional()
        .describe('Sale price excluding tax; takes precedence over salePrice'),
      taxIncludedPrice: z.number().optional().describe('Sale price including tax'),
      vatId: z.number().optional().describe('VAT ID from get_settings'),
      unitCode: z
        .string()
        .optional()
        .describe('Unit code from get_settings with includeUnits'),
      active: z.boolean().optional(),
      type: z.string().optional().describe('Product, Service, or Text'),
      salePrice: z.number().optional().describe('Sale price'),
      internalId: z.string().optional().describe('Your custom internal ID'),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including fields not shown in the summary'),
      productId: z.number().describe('Altoviz product ID'),
      name: z.string().nullable().optional(),
      number: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createProduct(ctx.input);

    return {
      output: {
        raw: result,
        productId: result.id,
        name: result.name,
        number: result.number
      },
      message: `Created product **${result.name}** (number: ${result.number}).`
    };
  })
  .build();
