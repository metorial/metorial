import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdSchema, queuedShape } from '../lib/schemas';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create or update a product in Drip's catalog via the Shopper Activity API. Product data enables automations like price drop notifications.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      productVariantId: z
        .string()
        .optional()
        .describe('Variant ID; defaults to productId for products with one variant.'),
      currencyCode: z
        .string()
        .optional()
        .describe('ISO currency code; defaults to USD at the provider.'),
      occurredAt: z.string().optional().describe('ISO-8601 activity timestamp.'),
      provider: z.string().describe('Ecommerce provider identifier.'),
      action: z.enum(['created', 'updated']).describe('Product action.'),
      productId: z.string().describe('Unique product identifier.'),
      name: z.string().describe('Product name.'),
      price: z
        .number()
        .optional()
        .describe(
          'Product price in currency units. Required by the current Product Activity API.'
        ),
      brand: z.string().optional().describe('Product brand.'),
      categories: z.array(z.string()).optional().describe('Product categories.'),
      inventory: z.number().optional().describe('Inventory count.'),
      imageUrl: z.string().optional().describe('Product image URL.'),
      productUrl: z.string().optional().describe('Product page URL.')
    })
  )
  .output(
    z.object({
      recorded: z
        .boolean()
        .describe('False when processing is only accepted and not independently confirmed.'),
      ...queuedShape
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.input.accountId ?? ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let product: Record<string, any> = {
      provider: ctx.input.provider,
      action: ctx.input.action,
      product_id: ctx.input.productId,
      product_variant_id: ctx.input.productVariantId ?? ctx.input.productId,
      name: ctx.input.name
    };

    if (ctx.input.price === undefined)
      throw createApiServiceError('price is required by the current Product Activity API.', {
        reason: 'invalid_input'
      });
    if (ctx.input.currencyCode !== undefined) product.currency = ctx.input.currencyCode;
    if (ctx.input.occurredAt !== undefined) product.occurred_at = ctx.input.occurredAt;
    if (ctx.input.price !== undefined) product.price = ctx.input.price;
    if (ctx.input.brand) product.brand = ctx.input.brand;
    if (ctx.input.categories) product.categories = ctx.input.categories;
    if (ctx.input.inventory !== undefined) product.inventory = ctx.input.inventory;
    if (ctx.input.imageUrl) product.image_url = ctx.input.imageUrl;
    if (ctx.input.productUrl) product.product_url = ctx.input.productUrl;

    const result = await client.createOrUpdateProduct(product);

    return {
      output: {
        recorded: false,
        accepted: true,
        completed: false,
        requestIds: result.request_ids,
        partialErrors: result.errors
      },
      message:
        'Drip accepted the product activity for background processing; completion is unconfirmed.'
    };
  })
  .build();
