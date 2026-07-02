import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      provider: z.string().describe('Ecommerce provider identifier.'),
      action: z.enum(['created', 'updated']).describe('Product action.'),
      productId: z.string().describe('Unique product identifier.'),
      name: z.string().describe('Product name.'),
      price: z.number().optional().describe('Product price.'),
      brand: z.string().optional().describe('Product brand.'),
      categories: z.array(z.string()).optional().describe('Product categories.'),
      inventory: z.number().optional().describe('Inventory count.'),
      imageUrl: z.string().optional().describe('Product image URL.'),
      productUrl: z.string().optional().describe('Product page URL.')
    })
  )
  .output(
    z.object({
      recorded: z.boolean().describe('Whether the product was recorded.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let product: Record<string, any> = {
      provider: ctx.input.provider,
      action: ctx.input.action,
      product_id: ctx.input.productId,
      name: ctx.input.name
    };

    if (ctx.input.price !== undefined) product.price = ctx.input.price;
    if (ctx.input.brand) product.brand = ctx.input.brand;
    if (ctx.input.categories) product.categories = ctx.input.categories;
    if (ctx.input.inventory !== undefined) product.inventory = ctx.input.inventory;
    if (ctx.input.imageUrl) product.image_url = ctx.input.imageUrl;
    if (ctx.input.productUrl) product.product_url = ctx.input.productUrl;

    await client.createOrUpdateProduct(product);

    return {
      output: { recorded: true },
      message: `Product **${ctx.input.name}** (${ctx.input.productId}) ${ctx.input.action}.`
    };
  })
  .build();
