import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product in Agiled. Define the product name, price, description, and tax details for use in invoices and estimates.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Product name'),
      price: z.number().describe('Unit price of the product'),
      description: z.string().optional().describe('Product description'),
      taxId: z.string().optional().describe('Tax ID to apply to the product'),
      unitType: z.string().optional().describe('Unit type (e.g. "hour", "unit", "piece")'),
      hsnSacCode: z.string().optional().describe('HSN/SAC code for tax classification')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the created product'),
      name: z.string().describe('Product name'),
      price: z.number().optional().describe('Product price')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createProduct({
      name: ctx.input.name,
      price: ctx.input.price,
      description: ctx.input.description,
      tax_id: ctx.input.taxId,
      unit_type: ctx.input.unitType,
      hsn_sac_code: ctx.input.hsnSacCode
    });

    let product = result.data;

    return {
      output: {
        productId: String(product.id ?? ''),
        name: String(product.name ?? ctx.input.name),
        price: (product.price as number | undefined) ?? ctx.input.price
      },
      message: `Created product **${ctx.input.name}** (${ctx.input.price}).`
    };
  })
  .build();
