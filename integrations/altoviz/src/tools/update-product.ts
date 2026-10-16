import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product in Altoviz.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      productId: z.number().describe('Altoviz product ID'),
      name: z.string().optional(),
      number: z.string().optional(),
      description: z.string().optional(),
      purchasePrice: z.number().optional(),
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
      salePrice: z.number().optional(),
      internalId: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional()
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete provider response, including fields not shown in the summary'),
      productId: z.number(),
      name: z.string().nullable().optional(),
      number: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { productId, ...updateData } = ctx.input;
    let result = await client.updateProduct(productId, updateData);

    return {
      output: {
        raw: result,
        productId: result.id,
        name: result.name,
        number: result.number
      },
      message: `Updated product **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
