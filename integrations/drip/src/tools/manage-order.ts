import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  productId: z.string().optional().describe('Product ID.'),
  sku: z.string().optional().describe('SKU.'),
  name: z.string().describe('Product name.'),
  price: z.number().describe('Price in cents or dollars depending on provider.'),
  quantity: z.number().optional().describe('Quantity purchased.'),
  categories: z.array(z.string()).optional().describe('Product categories.'),
  imageUrl: z.string().optional().describe('Product image URL.'),
  productUrl: z.string().optional().describe('Product page URL.')
});

let addressSchema = z
  .object({
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    company: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional()
  })
  .optional();

export let manageOrder = SlateTool.create(spec, {
  name: 'Manage Order',
  key: 'manage_order',
  description: `Create or update an order for a subscriber using Drip's Shopper Activity API. Supports order lifecycle actions: placed, updated, paid, fulfilled, refunded, canceled. Drip automatically updates subscriber lifetime value based on orders and refunds.`,
  instructions: [
    'Set the action field to the order lifecycle stage (placed, updated, paid, fulfilled, refunded, canceled).',
    'The provider field should identify your ecommerce platform (e.g. "shopify", "my_custom_platform").'
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
      action: z
        .enum(['placed', 'updated', 'paid', 'fulfilled', 'refunded', 'canceled'])
        .describe('Order lifecycle action.'),
      orderId: z.string().describe('Unique order identifier from your system.'),
      grandTotal: z.number().optional().describe('Order grand total.'),
      totalDiscounts: z.number().optional().describe('Total discounts applied.'),
      totalTaxes: z.number().optional().describe('Total taxes.'),
      totalFees: z.number().optional().describe('Total fees.'),
      totalShipping: z.number().optional().describe('Total shipping cost.'),
      currencyCode: z.string().optional().describe('ISO 4217 currency code (e.g. "USD").'),
      orderUrl: z.string().optional().describe('URL to the order details page.'),
      items: z.array(lineItemSchema).optional().describe('Line items in the order.'),
      billingAddress: addressSchema.describe('Billing address.'),
      shippingAddress: addressSchema.describe('Shipping address.'),
      occurredAt: z.string().optional().describe('ISO-8601 timestamp of the order action.'),
      refundAmount: z.number().optional().describe('Refund amount (for refunded action).')
    })
  )
  .output(
    z.object({
      recorded: z.boolean().describe('Whether the order was recorded.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    let order: Record<string, any> = {
      email: ctx.input.email,
      provider: ctx.input.provider,
      action: ctx.input.action,
      order_id: ctx.input.orderId
    };

    if (ctx.input.grandTotal !== undefined) order.grand_total = ctx.input.grandTotal;
    if (ctx.input.totalDiscounts !== undefined)
      order.total_discounts = ctx.input.totalDiscounts;
    if (ctx.input.totalTaxes !== undefined) order.total_taxes = ctx.input.totalTaxes;
    if (ctx.input.totalFees !== undefined) order.total_fees = ctx.input.totalFees;
    if (ctx.input.totalShipping !== undefined) order.total_shipping = ctx.input.totalShipping;
    if (ctx.input.currencyCode) order.currency_code = ctx.input.currencyCode;
    if (ctx.input.orderUrl) order.order_url = ctx.input.orderUrl;
    if (ctx.input.occurredAt) order.occurred_at = ctx.input.occurredAt;
    if (ctx.input.refundAmount !== undefined) order.refund_amount = ctx.input.refundAmount;

    if (ctx.input.items) {
      order.items = ctx.input.items.map(item => ({
        product_id: item.productId,
        sku: item.sku,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        categories: item.categories,
        image_url: item.imageUrl,
        product_url: item.productUrl
      }));
    }

    if (ctx.input.billingAddress) {
      order.billing_address = {
        name: ctx.input.billingAddress.name,
        first_name: ctx.input.billingAddress.firstName,
        last_name: ctx.input.billingAddress.lastName,
        company: ctx.input.billingAddress.company,
        address_1: ctx.input.billingAddress.address1,
        address_2: ctx.input.billingAddress.address2,
        city: ctx.input.billingAddress.city,
        state: ctx.input.billingAddress.state,
        zip: ctx.input.billingAddress.zip,
        country: ctx.input.billingAddress.country,
        phone: ctx.input.billingAddress.phone
      };
    }

    if (ctx.input.shippingAddress) {
      order.shipping_address = {
        name: ctx.input.shippingAddress.name,
        first_name: ctx.input.shippingAddress.firstName,
        last_name: ctx.input.shippingAddress.lastName,
        company: ctx.input.shippingAddress.company,
        address_1: ctx.input.shippingAddress.address1,
        address_2: ctx.input.shippingAddress.address2,
        city: ctx.input.shippingAddress.city,
        state: ctx.input.shippingAddress.state,
        zip: ctx.input.shippingAddress.zip,
        country: ctx.input.shippingAddress.country,
        phone: ctx.input.shippingAddress.phone
      };
    }

    await client.createOrUpdateOrder(order);

    return {
      output: { recorded: true },
      message: `Order **${ctx.input.orderId}** (${ctx.input.action}) recorded for **${ctx.input.email}**.`
    };
  })
  .build();
