import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

export let getSale = SlateTool.create(spec, {
  name: 'Get Sale',
  key: 'get_sale',
  description: `Retrieve detailed information about a specific Gumroad sale, including buyer details, product info, and transaction amounts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      saleId: z.string().describe('The sale ID to retrieve')
    })
  )
  .output(
    z.object({
      saleId: z.string().describe('Unique sale ID'),
      email: z.string().optional().describe('Buyer email address'),
      sellerEmail: z.string().optional().describe('Seller email address'),
      productId: z.string().optional().describe('Product ID'),
      productName: z.string().optional().describe('Product name'),
      productPermalink: z.string().optional().describe('Product permalink'),
      priceCents: z.number().optional().describe('Sale price in cents'),
      currency: z.string().optional().describe('Currency code'),
      quantity: z.number().optional().describe('Quantity purchased'),
      refunded: z.boolean().optional().describe('Whether the sale was refunded'),
      disputed: z.boolean().optional().describe('Whether the sale is disputed'),
      createdAt: z.string().optional().describe('Sale creation timestamp'),
      orderNumber: z.number().optional().describe('Order number'),
      shipped: z.boolean().optional().describe('Whether the sale has been marked as shipped'),
      licenseKey: z.string().optional().describe('License key if applicable'),
      variants: z.any().optional().describe('Selected variant options'),
      customFields: z.any().optional().describe('Custom field values provided by the buyer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let s = await client.getSale(ctx.input.saleId);

    return {
      output: {
        saleId: s.id,
        email: s.email || undefined,
        sellerEmail: s.seller_email || undefined,
        productId: s.product_id || undefined,
        productName: s.product_name || undefined,
        productPermalink: s.product_permalink || undefined,
        priceCents: s.price,
        currency: s.currency,
        quantity: s.quantity,
        refunded: s.refunded,
        disputed: s.disputed,
        createdAt: s.created_at || undefined,
        orderNumber: s.order_number || undefined,
        shipped: s.shipped,
        licenseKey: s.license_key || undefined,
        variants: s.variants || undefined,
        customFields: s.custom_fields || undefined
      },
      message: `Retrieved sale **${s.id}** for product **${s.product_name || 'unknown'}**.`
    };
  })
  .build();
