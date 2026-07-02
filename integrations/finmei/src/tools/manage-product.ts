import { SlateTool } from 'slates';
import { z } from 'zod';
import { FinmeiClient } from '../lib/client';
import { spec } from '../spec';

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, or delete a product in the Finmei product catalog. Products can be referenced when creating invoices.`,
  instructions: [
    'To **create** a product, set action to "create" and provide at least a **name**.',
    'To **update** a product, set action to "update", provide the **productId**, and the fields to change.',
    'To **delete** a product, set action to "delete" and provide the **productId**.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the product'),
      productId: z.string().optional().describe('Product ID (required for update and delete)'),
      name: z.string().optional().describe('Product name'),
      price: z.number().optional().describe('Product price'),
      currency: z.string().optional().describe('Three-letter currency code (e.g., "USD")'),
      description: z.string().optional().describe('Product description')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      productId: z.string().optional().describe('ID of the product'),
      product: z.any().optional().describe('Product details (for create/update actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.productId) {
        throw new Error('productId is required for delete action');
      }
      await client.deleteProduct(ctx.input.productId);

      return {
        output: {
          success: true,
          productId: ctx.input.productId
        },
        message: `Deleted product \`${ctx.input.productId}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required to create a product');
      }

      let result = await client.createProduct({
        name: ctx.input.name,
        price: ctx.input.price,
        currency: ctx.input.currency,
        description: ctx.input.description
      });

      let product = result?.data ?? result;
      let productId = String(product?.id ?? '');

      return {
        output: {
          success: true,
          productId,
          product
        },
        message: `Created product **${ctx.input.name}** (ID: ${productId}).`
      };
    }

    // update
    if (!ctx.input.productId) {
      throw new Error('productId is required for update action');
    }

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.price !== undefined) updateData.price = ctx.input.price;
    if (ctx.input.currency !== undefined) updateData.currency = ctx.input.currency;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;

    let result = await client.updateProduct(ctx.input.productId, updateData);
    let product = result?.data ?? result;

    return {
      output: {
        success: true,
        productId: ctx.input.productId,
        product
      },
      message: `Updated product \`${ctx.input.productId}\`.`
    };
  })
  .build();
