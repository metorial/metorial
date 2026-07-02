import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cartItemSchema = z.object({
  productId: z.string().describe('Product ID.'),
  name: z.string().describe('Product name.'),
  price: z.number().describe('Item price.'),
  quantity: z.number().optional().describe('Quantity.'),
  sku: z.string().optional().describe('SKU.'),
  categories: z.array(z.string()).optional().describe('Product categories.'),
  imageUrl: z.string().optional().describe('Product image URL.'),
  productUrl: z.string().optional().describe('Product page URL.')
});

export let manageCart = SlateTool.create(spec, {
  name: 'Manage Cart',
  key: 'manage_cart',
  description: `Create or update a shopping cart for a subscriber via Drip's Shopper Activity API. Used for cart abandonment workflows and dynamic content in emails.`,
  instructions: [
    'The provider field should identify your ecommerce platform.',
    'Provide a cartUrl so Drip can link the subscriber back to their cart in abandonment emails.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Subscriber email address.'),
      provider: z
        .string()
        .describe('Ecommerce provider identifier (e.g. "shopify", "my_custom_platform").'),
      action: z.enum(['created', 'updated']).describe('Cart action.'),
      cartId: z.string().describe('Unique cart identifier.'),
      cartUrl: z.string().optional().describe('URL to the cart page.'),
      grandTotal: z.number().optional().describe('Cart total.'),
      totalDiscounts: z.number().optional().describe('Total discounts.'),
      currencyCode: z.string().optional().describe('ISO 4217 currency code.'),
      items: z.array(cartItemSchema).describe('Items in the cart.'),
      occurredAt: z.string().optional().describe('ISO-8601 timestamp.')
    })
  )
  .output(
    z.object({
      recorded: z.boolean().describe('Whether the cart was recorded.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let cart: Record<string, any> = {
      email: ctx.input.email,
      provider: ctx.input.provider,
      action: ctx.input.action,
      cart_id: ctx.input.cartId
    };

    if (ctx.input.cartUrl) cart.cart_url = ctx.input.cartUrl;
    if (ctx.input.grandTotal !== undefined) cart.grand_total = ctx.input.grandTotal;
    if (ctx.input.totalDiscounts !== undefined)
      cart.total_discounts = ctx.input.totalDiscounts;
    if (ctx.input.currencyCode) cart.currency_code = ctx.input.currencyCode;
    if (ctx.input.occurredAt) cart.occurred_at = ctx.input.occurredAt;

    cart.items = ctx.input.items.map(item => ({
      product_id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      sku: item.sku,
      categories: item.categories,
      image_url: item.imageUrl,
      product_url: item.productUrl
    }));

    await client.createOrUpdateCart(cart);

    return {
      output: { recorded: true },
      message: `Cart **${ctx.input.cartId}** (${ctx.input.action}) recorded for **${ctx.input.email}**.`
    };
  })
  .build();
