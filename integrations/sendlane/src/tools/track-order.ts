import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneEcommerceClient } from '../lib/ecommerce-client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  productId: z
    .union([z.string(), z.number()])
    .describe('Product ID from your eCommerce platform'),
  sku: z.string().optional().describe('Product SKU'),
  productName: z.string().describe('Product display name'),
  quantity: z.number().describe('Quantity ordered'),
  itemPrice: z.number().describe('Price per item'),
  total: z.number().describe('Total for this line item (quantity × price)'),
  productUrl: z.string().optional().describe('URL to the product page'),
  productImageUrl: z.string().optional().describe('URL to the product image')
});

export let trackOrder = SlateTool.create(spec, {
  name: 'Track Order Placed',
  key: 'track_order',
  description: `Send an order placed event to Sendlane for eCommerce tracking. This records a completed purchase and triggers automations based on purchase behavior. Each order's line items will automatically generate ordered product events.`,
  instructions: [
    'The eventId must be unique per order — duplicate event+ID combinations are ignored by Sendlane.',
    'Use the integrationToken from your Sendlane Custom Integration settings, not the API v2 token.',
    'For historical data syncs, set initialSync to true and provide a time or dateCreated value.'
  ],
  constraints: [
    'Historical data older than 24 hours will not trigger automations.',
    'Changes to the total after submission will not be reflected in Sendlane.'
  ]
})
  .input(
    z.object({
      integrationToken: z
        .string()
        .describe('Sendlane Custom Integration token (separate from API v2 token)'),
      eventId: z
        .string()
        .describe('Unique event identifier (e.g. order ID). Duplicates are skipped.'),
      email: z.string().describe('Customer email address'),
      total: z.number().describe('Total monetary value of the order'),
      lineItems: z.array(lineItemSchema).describe('Products in the order'),
      orderId: z
        .union([z.string(), z.number()])
        .optional()
        .describe('Order ID from your platform'),
      subtotal: z.number().optional().describe('Subtotal before tax'),
      totalTax: z.number().optional().describe('Total tax amount'),
      totalItems: z.number().optional().describe('Total number of items'),
      currency: z.string().optional().describe('Currency code (e.g. USD)'),
      time: z.number().optional().describe('UNIX timestamp for historical sync'),
      dateCreated: z.string().optional().describe('Date string for historical sync'),
      initialSync: z.boolean().optional().describe('Set to true for historical data import'),
      billingAddress: z
        .record(z.string(), z.string())
        .optional()
        .describe('Billing address fields'),
      shippingAddress: z
        .record(z.string(), z.string())
        .optional()
        .describe('Shipping address fields')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let ecomClient = new SendlaneEcommerceClient(ctx.auth.token);

    await ecomClient.trackOrderPlaced({
      token: ctx.input.integrationToken,
      eventId: ctx.input.eventId,
      email: ctx.input.email,
      total: ctx.input.total,
      lineItems: ctx.input.lineItems.map(item => ({
        product_id: item.productId,
        sku: item.sku,
        product_name: item.productName,
        quantity: item.quantity,
        item_price: item.itemPrice,
        total: item.total,
        product_url: item.productUrl,
        product_image_url: item.productImageUrl
      })),
      orderId: ctx.input.orderId,
      subtotal: ctx.input.subtotal,
      totalTax: ctx.input.totalTax,
      totalItems: ctx.input.totalItems,
      currency: ctx.input.currency,
      time: ctx.input.time,
      dateCreated: ctx.input.dateCreated,
      initialSync: ctx.input.initialSync,
      billingAddress: ctx.input.billingAddress,
      shippingAddress: ctx.input.shippingAddress
    });

    return {
      output: { success: true },
      message: `Tracked order **${ctx.input.eventId}** for ${ctx.input.email} with ${ctx.input.lineItems.length} items totaling ${ctx.input.currency ?? 'USD'} ${ctx.input.total}.`
    };
  })
  .build();
