import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, or delete a product on a Squarespace store. Supports physical, service, and gift card products. Use the "action" field to specify the operation. When creating, a store page ID and at least one variant are required.`,
  instructions: [
    'To create a product, set action to "create" and provide storePageId, productType, and at least one variant',
    'To update, set action to "update" and provide productId with the fields to change',
    'To delete, set action to "delete" and provide productId',
    'Download products cannot be created or deleted via this tool'
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
        .enum(['PHYSICAL', 'SERVICE', 'GIFT_CARD'])
        .optional()
        .describe('Product type (required for create)'),
      name: z.string().optional().describe('Product name'),
      description: z.string().optional().describe('Product description (HTML supported)'),
      urlSlug: z.string().optional().describe('URL-friendly slug for the product'),
      tags: z.array(z.string()).optional().describe('Product tags for categorization'),
      isVisible: z.boolean().optional().describe('Whether the product is visible on the site'),
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
      if (!ctx.input.storePageId || !ctx.input.productType || !ctx.input.variants?.length) {
        throw new Error(
          'storePageId, productType, and at least one variant are required to create a product'
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
        variants: ctx.input.variants.map(v => ({
          sku: v.sku,
          pricing: {
            basePrice: {
              currency: v.priceCurrency,
              value: v.priceValue
            }
          },
          attributes: v.attributes
        }))
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
        throw new Error('productId is required to update a product');
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
        throw new Error('productId is required to delete a product');
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

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
