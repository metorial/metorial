import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createProductVariant = SlateTool.create(spec, {
  name: 'Create Product Variant',
  key: 'create_product_variant',
  description:
    'Create a named variant of an existing Salesmate product with its own sale price and currency. Call search_products to find the parent product ID.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      productId: z.string().min(1).describe('Parent product ID from search_products'),
      name: z.string().min(1).describe('Variant name'),
      unitPrice: z.number().nonnegative().describe('Variant sale price'),
      currency: z.string().length(3).describe('Three-letter currency code, such as USD'),
      isActive: z.boolean().optional().describe('Whether the variant is active for sales'),
      sku: z.string().optional().describe('Variant SKU or code'),
      description: z.string().optional().describe('Variant description'),
      tags: z.string().optional().describe('Comma-separated tags')
    })
  )
  .output(
    z.object({
      variantId: z.number().describe('ID of the created variant'),
      productId: z.string().describe('ID of the parent product'),
      variant: z
        .record(z.string(), z.unknown())
        .describe('Created variant, including its price details')
    })
  )
  .handleInvocation(async ctx => {
    let { productId, ...data } = ctx.input;
    let result = await createClient(ctx).createProductVariant(productId, {
      ...data,
      currency: data.currency.toUpperCase()
    });
    let variant: unknown = result?.Data;
    if (
      !isApiErrorRecord(variant) ||
      typeof variant.id !== 'number' ||
      !Number.isSafeInteger(variant.id) ||
      variant.id < 1
    ) {
      throw createApiServiceError('Salesmate did not return a valid created variant.', {
        reason: 'salesmate_invalid_response'
      });
    }
    return {
      output: { variantId: variant.id, productId, variant },
      message: `Product variant **${ctx.input.name}** created with ID \`${variant.id}\`.`
    };
  })
  .build();
