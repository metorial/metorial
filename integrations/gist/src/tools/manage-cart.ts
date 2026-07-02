import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let manageCart = SlateTool.create(spec, {
  name: 'Manage E-Commerce Cart',
  key: 'manage_cart',
  description: `Create, update, or delete an e-commerce shopping cart in Gist. Carts track line items and checkout URLs to power abandoned cart automations.`
})
  .input(
    z.object({
      action: z.enum(['create_or_update', 'delete']).describe('Action to perform'),
      cartId: z.string().optional().describe('Cart ID (required for delete)'),
      storeId: z.string().optional().describe('Store ID'),
      customerId: z.string().optional().describe('E-commerce customer ID'),
      currency: z.string().optional().describe('Currency code'),
      checkoutUrl: z.string().optional().describe('Checkout URL'),
      lineItems: z
        .array(
          z.object({
            productId: z.string().optional().describe('Product ID'),
            variantId: z.string().optional().describe('Product variant ID'),
            name: z.string().optional().describe('Item name'),
            quantity: z.number().optional().describe('Quantity'),
            price: z.number().optional().describe('Unit price')
          })
        )
        .optional()
        .describe('Cart line items')
    })
  )
  .output(
    z.object({
      cartId: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.cartId) throw new Error('cartId is required for delete');
      await client.deleteCart(ctx.input.cartId);
      return {
        output: { deleted: true },
        message: `Deleted cart **${ctx.input.cartId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.storeId) body.store_id = ctx.input.storeId;
    if (ctx.input.customerId) body.customer_id = ctx.input.customerId;
    if (ctx.input.currency) body.currency = ctx.input.currency;
    if (ctx.input.checkoutUrl) body.checkout_url = ctx.input.checkoutUrl;
    if (ctx.input.lineItems) {
      body.line_items = ctx.input.lineItems.map(li => ({
        product_id: li.productId,
        variant_id: li.variantId,
        name: li.name,
        quantity: li.quantity,
        price: li.price
      }));
    }

    let data = await client.createOrUpdateCart(body);
    let cart = data.cart || data;

    return {
      output: { cartId: String(cart.id) },
      message: `Cart **${cart.id}** created/updated.`
    };
  })
  .build();
