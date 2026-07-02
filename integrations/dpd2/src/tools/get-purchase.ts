import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPurchase = SlateTool.create(spec, {
  name: 'Get Purchase',
  key: 'get_purchase',
  description: `Retrieve detailed information about a specific purchase/order, including buyer details, line items with product keys, payment info, custom fields, coupons, and shipping details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      purchaseId: z.number().describe('The unique ID of the purchase to retrieve')
    })
  )
  .output(
    z.object({
      purchaseId: z.number().describe('Unique purchase ID'),
      status: z.string().describe('Purchase status (ACT, PND, RFD, ERR, CAN, HLD)'),
      currency: z.string().describe('Currency code'),
      subtotal: z.string().describe('Subtotal amount'),
      discount: z.string().describe('Discount amount'),
      tax: z.string().describe('Tax amount'),
      shipping: z.string().describe('Shipping amount'),
      total: z.string().describe('Total amount'),
      processorFee: z.string().describe('Payment processor fee'),
      buyerEmail: z.string().describe('Buyer email address'),
      buyerFirstname: z.string().describe('Buyer first name'),
      buyerLastname: z.string().describe('Buyer last name'),
      ipAddress: z.string().describe('Buyer IP address'),
      marketingOptin: z.boolean().describe('Whether buyer opted in to marketing'),
      tangiblesToshIp: z.number().describe('Number of tangible goods to ship'),
      customer: z
        .object({
          customerId: z.number().describe('Customer ID'),
          firstname: z.string().describe('Customer first name'),
          lastname: z.string().describe('Customer last name'),
          email: z.string().describe('Customer email')
        })
        .describe('Associated customer'),
      lineItems: z
        .array(
          z.object({
            productId: z.number().describe('Product ID'),
            productName: z.string().describe('Product name'),
            price: z.string().describe('Item price'),
            quantity: z.number().describe('Quantity purchased'),
            downloadLimit: z.number().describe('Download limit'),
            downloadCount: z.number().describe('Number of downloads so far'),
            expiresAt: z.number().nullable().describe('Expiration timestamp (UNIX) or null'),
            productKeys: z.array(z.string()).describe('Delivered product keys/codes')
          })
        )
        .describe('Purchased line items'),
      customFields: z
        .array(
          z.object({
            label: z.string().describe('Custom field label'),
            response: z.string().describe('Customer response')
          })
        )
        .describe('Custom fields from checkout'),
      coupons: z
        .array(
          z.object({
            name: z.string().describe('Coupon name'),
            code: z.string().describe('Coupon code'),
            discountAmount: z.string().describe('Discount amount'),
            discountType: z.string().describe('Discount type')
          })
        )
        .describe('Applied coupons'),
      createdAt: z.number().describe('Creation timestamp (UNIX)'),
      updatedAt: z.number().describe('Last updated timestamp (UNIX)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let purchase = await client.getPurchase(ctx.input.purchaseId);

    return {
      output: purchase,
      message: `Retrieved purchase **#${purchase.purchaseId}** — status: **${purchase.status}**, total: ${purchase.total} ${purchase.currency}, buyer: ${purchase.buyerEmail}.`
    };
  })
  .build();
