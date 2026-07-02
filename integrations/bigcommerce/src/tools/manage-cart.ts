import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  productId: z.number().describe('Product ID to add'),
  quantity: z.number().describe('Quantity to add'),
  variantId: z.number().optional().describe('Specific variant ID'),
  listPrice: z.number().optional().describe('Override list price')
});

export let manageCart = SlateTool.create(spec, {
  name: 'Manage Cart',
  key: 'manage_cart',
  description: `Create, retrieve, update, or delete carts and their line items. Supports creating draft carts with customer association, adding/removing items, and updating quantities.`,
  instructions: [
    'Use action "create" to create a new cart with line items.',
    'Use action "get" to retrieve an existing cart by cartId.',
    'Use action "add_items" to add line items to an existing cart.',
    'Use action "update_item" to change quantity of a specific line item.',
    'Use action "remove_item" to remove a specific line item.',
    'Use action "delete" to delete the entire cart.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'add_items', 'update_item', 'remove_item', 'delete'])
        .describe('Action to perform'),
      cartId: z
        .string()
        .optional()
        .describe('Cart ID (required for get/add_items/update_item/remove_item/delete)'),
      customerId: z.number().optional().describe('Customer ID to associate with the cart'),
      lineItems: z
        .array(lineItemSchema)
        .optional()
        .describe('Line items for create or add_items actions'),
      lineItemId: z
        .string()
        .optional()
        .describe('Specific line item ID for update_item or remove_item'),
      quantity: z.number().optional().describe('New quantity for update_item action')
    })
  )
  .output(
    z.object({
      cart: z.any().optional().describe('The cart object'),
      deleted: z.boolean().optional().describe('Whether the cart or item was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    let mapLineItems = (items: typeof ctx.input.lineItems) =>
      (items || []).map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        variant_id: item.variantId,
        list_price: item.listPrice
      }));

    if (ctx.input.action === 'create') {
      let data: Record<string, any> = {
        line_items: mapLineItems(ctx.input.lineItems)
      };
      if (ctx.input.customerId) data.customer_id = ctx.input.customerId;
      let result = await client.createCart(data);
      return {
        output: { cart: result.data },
        message: `Created cart (ID: ${result.data.id}) with ${ctx.input.lineItems?.length || 0} item(s).`
      };
    }

    if (!ctx.input.cartId) throw new Error('cartId is required for this action');

    if (ctx.input.action === 'get') {
      let result = await client.getCart(ctx.input.cartId);
      return {
        output: { cart: result.data },
        message: `Retrieved cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'add_items') {
      let data = { line_items: mapLineItems(ctx.input.lineItems) };
      let result = await client.addCartLineItems(ctx.input.cartId, data);
      return {
        output: { cart: result.data },
        message: `Added ${ctx.input.lineItems?.length || 0} item(s) to cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'update_item') {
      if (!ctx.input.lineItemId) throw new Error('lineItemId is required for update_item');
      let data: Record<string, any> = { line_item: { quantity: ctx.input.quantity } };
      let result = await client.updateCartLineItem(
        ctx.input.cartId,
        ctx.input.lineItemId,
        data
      );
      return {
        output: { cart: result.data },
        message: `Updated line item ${ctx.input.lineItemId} in cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'remove_item') {
      if (!ctx.input.lineItemId) throw new Error('lineItemId is required for remove_item');
      await client.deleteCartLineItem(ctx.input.cartId, ctx.input.lineItemId);
      return {
        output: { deleted: true },
        message: `Removed line item ${ctx.input.lineItemId} from cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteCart(ctx.input.cartId);
      return {
        output: { deleted: true },
        message: `Deleted cart ${ctx.input.cartId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
