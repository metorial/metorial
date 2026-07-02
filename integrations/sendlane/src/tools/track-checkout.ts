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
  quantity: z.number().describe('Quantity'),
  itemPrice: z.number().describe('Price per item'),
  total: z.number().describe('Total for this line item'),
  productUrl: z.string().optional().describe('URL to the product page'),
  productImageUrl: z.string().optional().describe('URL to the product image')
});

export let trackCheckout = SlateTool.create(spec, {
  name: 'Track Checkout Started',
  key: 'track_checkout',
  description: `Send a checkout started event to Sendlane for abandoned checkout tracking. This allows you to retarget contacts who begin checkout but don't complete their order. Include all product details for use in abandoned checkout emails.`,
  instructions: [
    'Use the integrationToken from your Sendlane Custom Integration settings, not the API v2 token.',
    'Include product names, images, and links so they can be used in abandoned checkout recovery emails.'
  ]
})
  .input(
    z.object({
      integrationToken: z.string().describe('Sendlane Custom Integration token'),
      email: z.string().describe('Customer email address'),
      checkoutId: z.string().describe('Unique checkout identifier'),
      total: z.number().describe('Total checkout amount'),
      lineItems: z.array(lineItemSchema).describe('Products in the checkout'),
      status: z.string().optional().describe('Checkout status'),
      checkoutUrl: z.string().optional().describe('URL to resume the checkout'),
      subtotal: z.number().optional().describe('Subtotal before tax'),
      totalTax: z.number().optional().describe('Total tax amount'),
      totalItems: z.number().optional().describe('Total number of items'),
      currency: z.string().optional().describe('Currency code (e.g. USD)')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let ecomClient = new SendlaneEcommerceClient(ctx.auth.token);

    await ecomClient.trackCheckoutStarted({
      token: ctx.input.integrationToken,
      email: ctx.input.email,
      checkoutId: ctx.input.checkoutId,
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
      status: ctx.input.status,
      checkoutUrl: ctx.input.checkoutUrl,
      subtotal: ctx.input.subtotal,
      totalTax: ctx.input.totalTax,
      totalItems: ctx.input.totalItems,
      currency: ctx.input.currency
    });

    return {
      output: { success: true },
      message: `Tracked checkout **${ctx.input.checkoutId}** for ${ctx.input.email} with ${ctx.input.lineItems.length} items totaling ${ctx.input.currency ?? 'USD'} ${ctx.input.total}.`
    };
  })
  .build();
