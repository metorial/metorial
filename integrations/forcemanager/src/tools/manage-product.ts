import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let productFields = z
  .object({
    model: z.string().optional().describe('Product model name'),
    description: z.string().optional().describe('Product description'),
    price: z.number().optional().describe('Product price'),
    cost: z.number().optional().describe('Product cost'),
    categoryId: z.number().optional().describe('Product category ID'),
    familyId: z.number().optional().describe('Product family ID'),
    maxDiscount: z.number().optional().describe('Maximum allowed discount percentage'),
    extId: z.string().optional().describe('External system ID for synchronization')
  })
  .describe('Product fields to set');

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, or delete product catalog entries in ForceManager.
Products include model names, pricing, cost, category/family classification, and discount limits.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      productId: z.number().optional().describe('Product ID (required for update and delete)'),
      fields: productFields
        .optional()
        .describe('Product fields (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      productId: z.number().optional().describe('ID of the affected product'),
      message: z.string().optional().describe('Status message'),
      product: z.any().optional().describe('Full product record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required for creating a product');
      }
      let result = await client.createProduct(ctx.input.fields);
      let productId = result?.id;
      let product = productId ? await client.getProduct(productId) : result;
      return {
        output: { productId, message: 'Product created successfully', product },
        message: `Created product **${ctx.input.fields.model || productId}** (ID: ${productId})`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.productId) {
        throw new Error('productId is required for updating a product');
      }
      await client.updateProduct(ctx.input.productId, ctx.input.fields || {});
      let product = await client.getProduct(ctx.input.productId);
      return {
        output: {
          productId: ctx.input.productId,
          message: 'Product updated successfully',
          product
        },
        message: `Updated product ID **${ctx.input.productId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.productId) {
        throw new Error('productId is required for deleting a product');
      }
      await client.deleteProduct(ctx.input.productId);
      return {
        output: { productId: ctx.input.productId, message: 'Product deleted successfully' },
        message: `Deleted product ID **${ctx.input.productId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
