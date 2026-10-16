import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, requireValue } from '../lib/response';
import { spec } from '../spec';

export let manageCart = SlateTool.create(spec, {
  name: 'Manage E-Commerce Cart',
  key: 'manage_cart',
  description: `Create, update, or delete an e-commerce shopping cart in Gist. Carts track line items and checkout URLs to power abandoned cart automations.`
})
  .input(
    z.object({
      action: z.enum(['create_or_update', 'delete']).describe('Action to perform'),
      cartId: z
        .string()
        .optional()
        .describe('Legacy cart identifier; Gist identifies carts by customerId and storeId'),
      storeId: z
        .string()
        .optional()
        .describe(
          'Store ID, required for all actions. Call manage_store with action list to discover stores.'
        ),
      customerId: z.string().optional().describe('E-commerce customer ID'),
      currency: z.string().optional().describe('Currency code'),
      orderTotal: z.number().optional().describe('Cart total, required for create_or_update'),
      discountTotal: z.number().optional().describe('Cart discount total'),
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
      rawResponse: z.any().optional().describe('Complete provider response data'),
      cartId: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let storeId = requireValue(
      ctx.input.storeId,
      'storeId; call manage_store with action list'
    );
    let client = new GistClient({ token: ctx.auth.token });

    let customerId = requireValue(ctx.input.customerId, 'customerId');
    if (ctx.input.action === 'delete') {
      await client.deleteCart(storeId, customerId);
      return {
        output: { rawResponse: client.responses, deleted: true },
        message: `Deleted cart for customer **${customerId}**.`
      };
    }

    requireValue(ctx.input.currency, 'Cart currency');
    if (ctx.input.orderTotal === undefined || !ctx.input.lineItems)
      throw createApiServiceError('Provide orderTotal and lineItems.');
    let body: Record<string, any> = {
      order_total: ctx.input.orderTotal,
      discount_total: ctx.input.discountTotal
    };
    if (ctx.input.storeId) body.store_id = ctx.input.storeId;
    if (ctx.input.customerId) body.customer_id = ctx.input.customerId;
    if (ctx.input.currency) body.currency_code = ctx.input.currency;
    if (ctx.input.checkoutUrl) body.checkout_url = ctx.input.checkoutUrl;
    if (ctx.input.lineItems) {
      body.line_items = ctx.input.lineItems.map(li => ({
        product_id: li.productId,
        product_variant_id: li.variantId,
        name: li.name,
        quantity: li.quantity,
        price: li.price
      }));
    }

    let data = await client.createOrUpdateCart(storeId, customerId, body);
    let cart = data.cart || data;

    return {
      output: {
        rawResponse: client.responses,
        cartId:
          cart.cart_id === undefined && cart.id === undefined
            ? undefined
            : requiredId(cart.cart_id ?? cart.id)
      },
      message: `Cart created/updated for customer **${customerId}**.`
    };
  })
  .build();
