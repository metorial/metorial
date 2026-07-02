import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product or service (inventory item) in Elorus. Products can be referenced on invoice line items and support multi-currency pricing.`
})
  .input(
    z.object({
      title: z.string().describe('Product/service name.'),
      description: z.string().optional().describe('Product description.'),
      code: z.string().optional().describe('Product code or SKU.'),
      unitValue: z.string().optional().describe('Default unit price (tax-exclusive).'),
      unit: z.string().optional().describe('Unit of measurement (e.g. "hrs", "pcs", "kg").'),
      currencyCode: z.string().optional().describe('Default currency code.'),
      taxes: z
        .array(z.string())
        .optional()
        .describe('Default tax IDs to apply when used on line items.'),
      customId: z.string().optional().describe('Custom external identifier (API-only).')
    })
  )
  .output(
    z.object({
      product: z.any().describe('The newly created product object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {
      title: ctx.input.title
    };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.code) body.code = ctx.input.code;
    if (ctx.input.unitValue) body.unit_value = ctx.input.unitValue;
    if (ctx.input.unit) body.unit = ctx.input.unit;
    if (ctx.input.currencyCode) body.currency_code = ctx.input.currencyCode;
    if (ctx.input.taxes) body.taxes = ctx.input.taxes;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let product = await client.createProduct(body);

    return {
      output: { product },
      message: `Created product: **${product.title}** (ID: ${product.id})`
    };
  })
  .build();
