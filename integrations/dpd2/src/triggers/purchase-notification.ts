import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  productName: z.string().describe('Product name'),
  productId: z.string().describe('DPD product ID'),
  quantity: z.string().describe('Quantity purchased'),
  grossAmount: z.string().describe('Item price'),
  currency: z.string().describe('Item currency'),
  sku: z.string().describe('Product SKU'),
  productKey: z.string().optional().describe('Delivered product key/code, if applicable')
});

export let purchaseNotification = SlateTrigger.create(spec, {
  name: 'Purchase Notification',
  key: 'purchase_notification',
  description:
    'Triggers when a customer completes a purchase. DPD sends an IPN-style notification with buyer details, order total, and line items. Configure the webhook URL in DPD admin under Integrations > Notification URL.'
})
  .input(
    z.object({
      transactionId: z.string().describe('Unique transaction ID'),
      buyerEmail: z.string().describe('Buyer email address'),
      buyerFirstname: z.string().describe('Buyer first name'),
      buyerLastname: z.string().describe('Buyer last name'),
      grossAmount: z.string().describe('Total payment amount'),
      currency: z.string().describe('Payment currency'),
      discount: z.string().describe('Discount amount applied'),
      tax: z.string().describe('Tax amount'),
      shippingAmount: z.string().describe('Shipping amount'),
      shippingMethod: z.string().describe('Shipping method'),
      couponCode: z.string().describe('Coupon code used, if any'),
      verifySign: z.string().describe('Verification signature'),
      lineItems: z.array(lineItemSchema).describe('Purchased items'),
      customFields: z.record(z.string(), z.string()).describe('Custom checkout fields'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw notification payload')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Unique transaction ID'),
      buyerEmail: z.string().describe('Buyer email address'),
      buyerFirstname: z.string().describe('Buyer first name'),
      buyerLastname: z.string().describe('Buyer last name'),
      grossAmount: z.string().describe('Total payment amount'),
      currency: z.string().describe('Payment currency'),
      discount: z.string().describe('Discount amount'),
      tax: z.string().describe('Tax amount'),
      shippingAmount: z.string().describe('Shipping amount'),
      shippingMethod: z.string().describe('Shipping method'),
      couponCode: z.string().describe('Coupon code used'),
      lineItems: z.array(lineItemSchema).describe('Purchased items'),
      customFields: z.record(z.string(), z.string()).describe('Custom checkout fields'),
      verified: z.boolean().describe('Whether the notification was verified via the DPD API')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, any>;

      let contentType = ctx.request.headers.get('content-type') || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      } else {
        body = (await ctx.request.json()) as Record<string, any>;
      }

      let lineItems: Array<{
        productName: string;
        productId: string;
        quantity: string;
        grossAmount: string;
        currency: string;
        sku: string;
        productKey?: string;
      }> = [];

      // Parse per-item fields (item_name1, item_number1, quantity1, mc_gross_1, etc.)
      let itemIndex = 1;
      while (body[`item_name${itemIndex}`] !== undefined) {
        let item: any = {
          productName: String(body[`item_name${itemIndex}`] ?? ''),
          productId: String(body[`item_number${itemIndex}`] ?? ''),
          quantity: String(body[`quantity${itemIndex}`] ?? '1'),
          grossAmount: String(body[`mc_gross_${itemIndex}`] ?? '0'),
          currency: String(body[`mc_currency_${itemIndex}`] ?? ''),
          sku: String(body[`sku${itemIndex}`] ?? '')
        };
        if (body[`product_key${itemIndex}`]) {
          item.productKey = String(body[`product_key${itemIndex}`]);
        }
        lineItems.push(item);
        itemIndex++;
      }

      // Parse custom fields (custom_1, custom_2, etc.)
      let customFields: Record<string, string> = {};
      for (let [key, value] of Object.entries(body)) {
        if (key.startsWith('custom_')) {
          customFields[key] = String(value);
        }
      }

      let transactionId = String(body.txn_id ?? '');

      return {
        inputs: [
          {
            transactionId,
            buyerEmail: String(body.payer_email ?? body.buyer_email ?? ''),
            buyerFirstname: String(body.first_name ?? body.buyer_firstname ?? ''),
            buyerLastname: String(body.last_name ?? body.buyer_lastname ?? ''),
            grossAmount: String(body.mc_gross ?? '0'),
            currency: String(body.mc_currency ?? ''),
            discount: String(body.discount ?? '0'),
            tax: String(body.tax ?? '0'),
            shippingAmount: String(body.mc_shipping ?? '0'),
            shippingMethod: String(body.shipping_method ?? ''),
            couponCode: String(body.coupon_code ?? ''),
            verifySign: String(body.verify_sign ?? ''),
            lineItems,
            customFields,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let verified = false;

      if (ctx.input.verifySign) {
        try {
          let client = new Client({
            username: ctx.auth.username,
            token: ctx.auth.token
          });
          let result = await client.verifyNotification(ctx.input.rawPayload);
          verified = result.verified;
        } catch {
          verified = false;
        }
      }

      return {
        type: 'purchase.completed',
        id: ctx.input.transactionId || `purchase_${Date.now()}`,
        output: {
          transactionId: ctx.input.transactionId,
          buyerEmail: ctx.input.buyerEmail,
          buyerFirstname: ctx.input.buyerFirstname,
          buyerLastname: ctx.input.buyerLastname,
          grossAmount: ctx.input.grossAmount,
          currency: ctx.input.currency,
          discount: ctx.input.discount,
          tax: ctx.input.tax,
          shippingAmount: ctx.input.shippingAmount,
          shippingMethod: ctx.input.shippingMethod,
          couponCode: ctx.input.couponCode,
          lineItems: ctx.input.lineItems,
          customFields: ctx.input.customFields,
          verified
        }
      };
    }
  })
  .build();
