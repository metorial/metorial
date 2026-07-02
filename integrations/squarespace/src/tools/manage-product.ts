import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { squarespaceServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, or delete a product on a Squarespace store. Supports physical, service, gift card, and digital products. Use the "action" field to specify the operation. Physical, service, and gift card products require at least one variant when creating.`,
  instructions: [
    'To create a product, set action to "create" and provide storePageId and productType. For non-digital products, provide at least one variant',
    'To update, set action to "update" and provide productId with at least one field to change',
    'To delete, set action to "delete" and provide productId',
    'Product updates are sent using Squarespace v2 change-wrapper fields'
  ],
  constraints: ['Maximum 100 variants per product', 'SKU maximum 60 characters'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      productId: z.string().optional().describe('Product ID (required for update and delete)'),
      storePageId: z.string().optional().describe('Store page ID (required for create)'),
      productType: z
        .enum(['PHYSICAL', 'SERVICE', 'GIFT_CARD', 'DIGITAL'])
        .optional()
        .describe('Product type (required for create)'),
      name: z.string().optional().describe('Product name'),
      description: z.string().optional().describe('Product description (HTML supported)'),
      urlSlug: z.string().optional().describe('URL-friendly slug for the product'),
      tags: z.array(z.string()).optional().describe('Product tags for categorization'),
      isVisible: z.boolean().optional().describe('Whether the product is visible on the site'),
      basePriceCurrency: z
        .string()
        .optional()
        .describe('ISO 4217 currency code for digital product-level pricing'),
      basePriceValue: z
        .string()
        .optional()
        .describe('Digital product-level base price amount as a string'),
      variants: z
        .array(
          z.object({
            sku: z.string().describe('Unique SKU identifier (max 60 chars)'),
            priceCurrency: z.string().describe('ISO 4217 currency code'),
            priceValue: z.string().describe('Price amount as string'),
            attributes: z
              .record(z.string(), z.string())
              .optional()
              .describe('Variant attributes (e.g., color, size)')
          })
        )
        .optional()
        .describe('Product variants (required for create)')
    })
  )
  .output(
    z.object({
      productId: z.string().optional().describe('Product ID'),
      action: z.string().describe('Action performed'),
      product: z.any().optional().describe('Full product data (for create/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.storePageId || !ctx.input.productType) {
        throw squarespaceServiceError(
          'storePageId and productType are required to create a product'
        );
      }

      if (ctx.input.productType !== 'DIGITAL' && !ctx.input.variants?.length) {
        throw squarespaceServiceError(
          'At least one variant is required to create a physical, service, or gift card product'
        );
      }

      if (
        ctx.input.productType === 'DIGITAL' &&
        (!ctx.input.basePriceCurrency || !ctx.input.basePriceValue)
      ) {
        throw squarespaceServiceError(
          'basePriceCurrency and basePriceValue are required to create a digital product'
        );
      }

      let product = await client.createProduct({
        type: ctx.input.productType,
        storePageId: ctx.input.storePageId,
        name: ctx.input.name,
        description: ctx.input.description,
        urlSlug: ctx.input.urlSlug,
        tags: ctx.input.tags,
        isVisible: ctx.input.isVisible,
        variants: ctx.input.variants?.map(v => ({
          sku: v.sku,
          pricing: {
            basePrice: {
              currency: v.priceCurrency,
              value: v.priceValue
            }
          },
          attributes: v.attributes
        })),
        pricing:
          ctx.input.basePriceCurrency && ctx.input.basePriceValue
            ? {
                basePrice: {
                  currency: ctx.input.basePriceCurrency,
                  value: ctx.input.basePriceValue
                }
              }
            : undefined
      });

      return {
        output: {
          productId: product.id,
          action: 'created',
          product
        },
        message: `Created product **"${product.name || product.id}"** with ${product.variants?.length || 0} variant(s).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.productId) {
        throw squarespaceServiceError('productId is required to update a product');
      }

      let hasUpdates =
        ctx.input.name !== undefined ||
        ctx.input.description !== undefined ||
        ctx.input.urlSlug !== undefined ||
        ctx.input.tags !== undefined ||
        ctx.input.isVisible !== undefined;

      if (!hasUpdates) {
        throw squarespaceServiceError(
          'At least one product field is required to update a product'
        );
      }

      let product = await client.updateProduct(ctx.input.productId, {
        name: ctx.input.name,
        description: ctx.input.description,
        urlSlug: ctx.input.urlSlug,
        tags: ctx.input.tags,
        isVisible: ctx.input.isVisible
      });

      return {
        output: {
          productId: product.id,
          action: 'updated',
          product
        },
        message: `Updated product **"${product.name || ctx.input.productId}"**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.productId) {
        throw squarespaceServiceError('productId is required to delete a product');
      }

      await client.deleteProduct(ctx.input.productId);

      return {
        output: {
          productId: ctx.input.productId,
          action: 'deleted'
        },
        message: `Deleted product **${ctx.input.productId}**.`
      };
    }

    throw squarespaceServiceError(`Unknown action: ${action}`);
  })
  .build();
