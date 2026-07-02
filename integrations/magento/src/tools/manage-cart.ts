import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

export let manageCart = SlateTool.create(spec, {
  name: 'Manage Cart',
  key: 'manage_cart',
  description: `Create and manage shopping carts. Create carts for customers or guests, add/update/remove items, apply or remove coupon codes, and view cart contents. Supports the full pre-checkout shopping experience.`,
  instructions: [
    'To **create** a cart, set action to "create" and optionally provide a customerId.',
    'To **get** cart details, set action to "get" with the cartId.',
    'To **add an item**, set action to "add_item" with cartId, itemSku, and itemQty.',
    'To **update an item** quantity, set action to "update_item" with cartId, cartItemId, and itemQty.',
    'To **remove an item**, set action to "remove_item" with cartId and cartItemId.',
    'To **apply a coupon**, set action to "apply_coupon" with cartId and couponCode.',
    'To **remove a coupon**, set action to "remove_coupon" with cartId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'add_item',
          'update_item',
          'remove_item',
          'apply_coupon',
          'remove_coupon'
        ])
        .describe('Cart operation'),
      cartId: z
        .number()
        .optional()
        .describe('Cart/quote ID (for operations on existing carts)'),
      customerId: z.number().optional().describe('Customer ID (for creating a customer cart)'),
      createAsGuest: z
        .boolean()
        .optional()
        .describe('Create a guest cart instead of a customer cart'),
      itemSku: z.string().optional().describe('Product SKU (for add_item)'),
      itemQty: z.number().optional().describe('Quantity (for add_item, update_item)'),
      cartItemId: z
        .number()
        .optional()
        .describe('Cart item ID (for update_item, remove_item)'),
      couponCode: z.string().optional().describe('Coupon code (for apply_coupon)')
    })
  )
  .output(
    z.object({
      cartId: z.number().optional().describe('Cart/quote ID'),
      guestCartId: z.string().optional().describe('Masked guest cart ID'),
      cart: z
        .object({
          cartId: z.number().optional().describe('Cart ID'),
          isActive: z.boolean().optional().describe('Whether the cart is active'),
          itemsCount: z.number().optional().describe('Number of distinct items'),
          itemsQty: z.number().optional().describe('Total quantity of all items'),
          items: z
            .array(
              z.object({
                cartItemId: z.number().optional().describe('Cart item ID'),
                sku: z.string().optional().describe('Product SKU'),
                name: z.string().optional().describe('Product name'),
                qty: z.number().optional().describe('Quantity'),
                price: z.number().optional().describe('Item price')
              })
            )
            .optional()
            .describe('Items in the cart')
        })
        .optional()
        .describe('Cart details'),
      addedItem: z
        .object({
          cartItemId: z.number().optional().describe('Cart item ID'),
          sku: z.string().optional().describe('Product SKU'),
          qty: z.number().optional().describe('Quantity'),
          price: z.number().optional().describe('Price')
        })
        .optional()
        .describe('Added or updated item details'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'create') {
      if (ctx.input.createAsGuest) {
        let guestCartId = await client.createGuestCart();
        return {
          output: { guestCartId },
          message: `Created guest cart with masked ID \`${guestCartId}\`.`
        };
      }
      if (ctx.input.customerId) {
        let cartId = await client.createCartForCustomer(ctx.input.customerId);
        return {
          output: { cartId },
          message: `Created cart **${cartId}** for customer \`${ctx.input.customerId}\`.`
        };
      }
      let cartId = await client.createCart();
      return {
        output: { cartId },
        message: `Created cart **${cartId}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.cartId) throw new Error('cartId is required for get action');
      let cart = await client.getCart(ctx.input.cartId);
      return {
        output: {
          cart: {
            cartId: cart.id,
            isActive: cart.is_active,
            itemsCount: cart.items_count,
            itemsQty: cart.items_qty,
            items: cart.items?.map(i => ({
              cartItemId: i.item_id,
              sku: i.sku,
              name: i.name,
              qty: i.qty,
              price: i.price
            }))
          }
        },
        message: `Retrieved cart **${cart.id}** with ${cart.items_count || 0} item(s).`
      };
    }

    if (ctx.input.action === 'add_item') {
      if (!ctx.input.cartId) throw new Error('cartId is required');
      if (!ctx.input.itemSku) throw new Error('itemSku is required for add_item');
      if (ctx.input.itemQty === undefined) throw new Error('itemQty is required for add_item');
      let item = await client.addCartItem(ctx.input.cartId, {
        sku: ctx.input.itemSku,
        qty: ctx.input.itemQty
      });
      return {
        output: {
          addedItem: {
            cartItemId: item.item_id,
            sku: item.sku,
            qty: item.qty,
            price: item.price
          }
        },
        message: `Added **${item.qty}x ${item.sku}** to cart \`${ctx.input.cartId}\`.`
      };
    }

    if (ctx.input.action === 'update_item') {
      if (!ctx.input.cartId) throw new Error('cartId is required');
      if (!ctx.input.cartItemId) throw new Error('cartItemId is required for update_item');
      if (ctx.input.itemQty === undefined)
        throw new Error('itemQty is required for update_item');
      let item = await client.updateCartItem(ctx.input.cartId, ctx.input.cartItemId, {
        qty: ctx.input.itemQty
      });
      return {
        output: {
          addedItem: {
            cartItemId: item.item_id,
            sku: item.sku,
            qty: item.qty,
            price: item.price
          }
        },
        message: `Updated cart item \`${ctx.input.cartItemId}\` to quantity **${ctx.input.itemQty}**.`
      };
    }

    if (ctx.input.action === 'remove_item') {
      if (!ctx.input.cartId) throw new Error('cartId is required');
      if (!ctx.input.cartItemId) throw new Error('cartItemId is required for remove_item');
      await client.removeCartItem(ctx.input.cartId, ctx.input.cartItemId);
      return {
        output: { success: true },
        message: `Removed item \`${ctx.input.cartItemId}\` from cart \`${ctx.input.cartId}\`.`
      };
    }

    if (ctx.input.action === 'apply_coupon') {
      if (!ctx.input.cartId) throw new Error('cartId is required');
      if (!ctx.input.couponCode) throw new Error('couponCode is required for apply_coupon');
      await client.applyCoupon(ctx.input.cartId, ctx.input.couponCode);
      return {
        output: { success: true },
        message: `Applied coupon \`${ctx.input.couponCode}\` to cart \`${ctx.input.cartId}\`.`
      };
    }

    // remove_coupon
    if (!ctx.input.cartId) throw new Error('cartId is required');
    await client.removeCoupon(ctx.input.cartId);
    return {
      output: { success: true },
      message: `Removed coupon from cart \`${ctx.input.cartId}\`.`
    };
  })
  .build();
