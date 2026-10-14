import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new product or service (inventory item) in Elorus. Products can be referenced on invoice line items and store default sale prices in the organization base currency.`
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      title: z.string().describe('Product/service name.'),
      description: z.string().optional().describe('Product description.'),
      code: z.string().optional().describe('Product code or SKU.'),
      unitValue: z.string().optional().describe('Default unit price (tax-exclusive).'),
      unit: z.string().optional().describe('Unit of measurement (e.g. "hour", "item", "kg").'),
      currencyCode: z
        .string()
        .optional()
        .describe(
          'Product prices use the organization base currency; supplying this unsupported field is rejected.'
        ),
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
      organizationId: ctx.input.organizationId ?? ctx.config.organizationId
    });

    if (ctx.input.currencyCode !== undefined) {
      throw createApiServiceError(
        'Elorus product prices use the organization base currency; omit currencyCode.',
        { reason: 'unsupported_product_currency' }
      );
    }

    let body: any = {
      title: ctx.input.title
    };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.code) body.code = ctx.input.code;
    if (ctx.input.unitValue) body.sale_value = ctx.input.unitValue;
    if (ctx.input.unit) body.unit_measure = ctx.input.unit;
    if (ctx.input.taxes) body.sale_taxes = ctx.input.taxes;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let product = await client.createProduct(body);

    return {
      output: { product },
      message: `Created product: **${product.title}** (ID: ${product.id})`
    };
  })
  .build();
