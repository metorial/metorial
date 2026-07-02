import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bigcommerceServiceError } from '../lib/errors';
import { spec } from '../spec';

let lineItemSchema = z.object({
  productId: z.number().describe('Product ID to add'),
  quantity: z.number().describe('Quantity to add'),
  variantId: z.number().optional().describe('Specific variant ID'),
  listPrice: z.number().optional().describe('Override list price'),
  optionSelections: z
    .array(
      z.object({
        optionId: z.number().describe('Product option ID'),
        optionValue: z.any().describe('Selected option value')
      })
    )
    .optional()
    .describe('Product option selections for configurable products')
});

export let manageCart = SlateTool.create(spec, {
  name: 'Manage Cart',
  key: 'manage_cart',
  description: `Create, retrieve, update, or delete carts and their line items. Supports draft carts, item quantity or list price updates, and one-time cart or checkout redirect URLs.`,
  instructions: [
    'Use action "create" to create a new cart with line items.',
    'Use action "get" to retrieve an existing cart by cartId.',
    'Use action "add_items" to add line items to an existing cart.',
    'Use action "update_item" to change quantity or listPrice of a specific line item.',
    'Use action "remove_item" to remove a specific line item.',
    'Use action "create_redirect_url" to create one-time redirect URLs for a cart.',
    'Use action "delete" to delete the entire cart.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'add_items',
          'update_item',
          'remove_item',
          'create_redirect_url',
          'delete'
        ])
        .describe('Action to perform'),
      cartId: z
        .string()
        .optional()
        .describe(
          'Cart ID (required for get/add_items/update_item/remove_item/create_redirect_url/delete)'
        ),
      customerId: z.number().optional().describe('Customer ID to associate with the cart'),
      lineItems: z
        .array(lineItemSchema)
        .optional()
        .describe('Line items for create or add_items actions'),
      lineItemId: z
        .string()
        .optional()
        .describe('Specific line item ID for update_item or remove_item'),
      quantity: z.number().optional().describe('New quantity for update_item action'),
      listPrice: z.number().optional().describe('New list price for update_item action'),
      version: z
        .number()
        .optional()
        .describe('Expected cart version for optimistic concurrency control'),
      include: z
        .array(
          z.enum([
            'redirect_urls',
            'line_items.physical_items.options',
            'line_items.digital_items.options',
            'promotions.banners'
          ])
        )
        .optional()
        .describe('Cart sub-resources to include in create/get/add/update responses'),
      queryParams: z
        .record(z.string(), z.string())
        .optional()
        .describe('Optional query parameters for create_redirect_url')
    })
  )
  .output(
    z.object({
      cart: z.any().optional().describe('The cart object'),
      redirectUrls: z.any().optional().describe('Created cart redirect URLs'),
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
        list_price: item.listPrice,
        option_selections: item.optionSelections?.map(selection => ({
          option_id: selection.optionId,
          option_value: selection.optionValue
        }))
      }));

    let params: Record<string, any> = {};
    if (ctx.input.include?.length) params.include = ctx.input.include.join(',');

    if (ctx.input.action === 'create') {
      if (!ctx.input.lineItems?.length) {
        throw bigcommerceServiceError('lineItems is required for create');
      }

      let data: Record<string, any> = {
        line_items: mapLineItems(ctx.input.lineItems)
      };
      if (ctx.input.customerId) data.customer_id = ctx.input.customerId;
      if (ctx.input.version !== undefined) data.version = ctx.input.version;
      let result = await client.createCart(data, params);
      return {
        output: { cart: result.data },
        message: `Created cart (ID: ${result.data.id}) with ${ctx.input.lineItems?.length || 0} item(s).`
      };
    }

    if (!ctx.input.cartId) {
      throw bigcommerceServiceError('cartId is required for this action');
    }

    if (ctx.input.action === 'get') {
      let result = await client.getCart(ctx.input.cartId, params);
      return {
        output: { cart: result.data },
        message: `Retrieved cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'add_items') {
      if (!ctx.input.lineItems?.length) {
        throw bigcommerceServiceError('lineItems is required for add_items');
      }

      let data: Record<string, any> = { line_items: mapLineItems(ctx.input.lineItems) };
      if (ctx.input.version !== undefined) data.version = ctx.input.version;
      let result = await client.addCartLineItems(ctx.input.cartId, data, params);
      return {
        output: { cart: result.data },
        message: `Added ${ctx.input.lineItems?.length || 0} item(s) to cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'update_item') {
      if (!ctx.input.lineItemId) {
        throw bigcommerceServiceError('lineItemId is required for update_item');
      }
      if (ctx.input.quantity === undefined && ctx.input.listPrice === undefined) {
        throw bigcommerceServiceError('quantity or listPrice is required for update_item');
      }

      let lineItem: Record<string, any> = {};
      if (ctx.input.quantity !== undefined) lineItem.quantity = ctx.input.quantity;
      if (ctx.input.listPrice !== undefined) lineItem.list_price = ctx.input.listPrice;

      let data: Record<string, any> = { line_item: lineItem };
      if (ctx.input.version !== undefined) data.version = ctx.input.version;

      let result = await client.updateCartLineItem(
        ctx.input.cartId,
        ctx.input.lineItemId,
        data,
        params
      );
      return {
        output: { cart: result.data },
        message: `Updated line item ${ctx.input.lineItemId} in cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'remove_item') {
      if (!ctx.input.lineItemId) {
        throw bigcommerceServiceError('lineItemId is required for remove_item');
      }
      await client.deleteCartLineItem(ctx.input.cartId, ctx.input.lineItemId);
      return {
        output: { deleted: true },
        message: `Removed line item ${ctx.input.lineItemId} from cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'create_redirect_url') {
      let result = await client.createCartRedirectUrl(ctx.input.cartId, {
        query_params: ctx.input.queryParams
      });
      return {
        output: { redirectUrls: result.data },
        message: `Created redirect URLs for cart ${ctx.input.cartId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteCart(ctx.input.cartId);
      return {
        output: { deleted: true },
        message: `Deleted cart ${ctx.input.cartId}.`
      };
    }

    throw bigcommerceServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
