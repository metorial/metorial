import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buyerSchema,
  couponSchema,
  customFieldSchema,
  mapBuyer,
  mapCustomFields,
  mapProduct,
  productSchema
} from '../lib/schemas';
import { spec } from '../spec';

let licenseKeySchema = z.object({
  key: z.string().describe('License key UUID'),
  productId: z.string().optional().describe('Associated product ID'),
  productTitle: z.string().optional().describe('Associated product title'),
  redeemed: z.boolean().describe('Whether redeemed'),
  redeemedAt: z.string().nullable().describe('Redemption timestamp'),
  refunded: z.boolean().describe('Whether refunded'),
  refundedAt: z.string().nullable().describe('Refund timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

let subscriptionInfoSchema = z.object({
  subscriptionId: z.string().describe('Stripe subscription ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  currency: z.string().optional().describe('Currency code'),
  amount: z.number().optional().describe('Subscription amount'),
  interval: z.string().optional().describe('Billing interval'),
  intervalCount: z.number().optional().describe('Interval multiplier'),
  status: z.string().optional().describe('Subscription status'),
  productId: z.string().optional().describe('Subscription product ID'),
  productTitle: z.string().optional().describe('Subscription product title')
});

let giftSchema = z.object({
  sendAsGift: z.boolean().describe('Whether sent as gift'),
  recipientName: z.string().optional().describe('Gift recipient name'),
  recipientEmail: z.string().optional().describe('Gift recipient email'),
  message: z.string().optional().describe('Gift message'),
  from: z.string().optional().describe('Gift sender name')
});

let webhookPayloadSchema = z.object({
  event: z.string(),
  data: z.any()
});

export let newSaleTrigger = SlateTrigger.create(spec, {
  name: 'New Sale',
  key: 'new_sale',
  description:
    'Triggers when a buyer completes a purchase where money is transacted. Includes full transaction details such as amount, buyer info, products, coupons, subscription details, and license keys.'
})
  .input(webhookPayloadSchema)
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      createdAt: z.string().describe('Transaction timestamp'),
      currency: z.string().describe('Currency code'),
      amount: z.number().describe('Transaction amount'),
      status: z.string().describe('Transaction status'),
      taxAmount: z.number().nullable().describe('Tax amount'),
      taxTransactionId: z.string().nullable().describe('Tax transaction ID'),
      buyer: buyerSchema.describe('Buyer information'),
      products: z.array(productSchema).describe('Purchased products'),
      coupon: couponSchema.nullable().describe('Applied coupon'),
      subscription: subscriptionInfoSchema
        .nullable()
        .describe('Subscription details if applicable'),
      gift: giftSchema.nullable().describe('Gift details if applicable'),
      customFields: z.array(customFieldSchema).describe('Custom checkout fields'),
      referrerEmail: z.string().nullable().describe('Referring affiliate email'),
      commissionEarned: z.number().nullable().describe('Affiliate commission earned'),
      commissionPaid: z.boolean().nullable().describe('Whether commission has been paid'),
      licenseKeys: z.array(licenseKeySchema).describe('Generated license keys')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let result = await client.subscribeWebhook('sale', ctx.input.webhookBaseUrl);
      return {
        registrationDetails: {
          webhookUrl: result.webhook,
          signingSecret: result.signing_secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.unsubscribeWebhook(ctx.input.registrationDetails.webhookUrl as string);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as { event: string; data: unknown };

      return {
        inputs: [body]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.data as Record<string, unknown>;

      let buyer = mapBuyer((data.buyer || {}) as Record<string, unknown>);
      let products = ((data.products || []) as Record<string, unknown>[]).map(mapProduct);
      let customFields = mapCustomFields(
        data.custom_fields as Record<string, unknown>[] | undefined
      );

      let couponData = data.coupon as Record<string, unknown> | null;
      let coupon = couponData
        ? {
            code: couponData.code as string,
            type: couponData.type as string,
            amount: couponData.amount as number
          }
        : null;

      let subData = data.subscription as Record<string, unknown> | null;
      let subscription = subData
        ? {
            subscriptionId: subData.subscription_id as string,
            createdAt: subData.created_at as string | undefined,
            currency: subData.currency as string | undefined,
            amount: subData.amount as number | undefined,
            interval: subData.interval as string | undefined,
            intervalCount: subData.interval_count as number | undefined,
            status: subData.status as string | undefined,
            productId: (subData.product as Record<string, unknown> | undefined)?.id as
              | string
              | undefined,
            productTitle: (subData.product as Record<string, unknown> | undefined)?.title as
              | string
              | undefined
          }
        : null;

      let giftData = data.gift as Record<string, unknown> | null;
      let gift = giftData
        ? {
            sendAsGift: giftData.send_as_gift as boolean,
            recipientName: giftData.recipient_name as string | undefined,
            recipientEmail: giftData.recipient_email as string | undefined,
            message: giftData.message as string | undefined,
            from: giftData.from as string | undefined
          }
        : null;

      let licenseKeysData = (data.license_keys || []) as Record<string, unknown>[];
      let licenseKeys = licenseKeysData.map(lk => ({
        key: lk.key as string,
        productId: lk.product_id as string | undefined,
        productTitle: lk.product_title as string | undefined,
        redeemed: lk.redeemed as boolean,
        redeemedAt: lk.redeemed_at ? String(lk.redeemed_at) : null,
        refunded: lk.refunded as boolean,
        refundedAt: lk.refunded_at ? String(lk.refunded_at) : null,
        createdAt: lk.created_at as string | undefined
      }));

      let referrer = data.referrer as Record<string, unknown> | null;

      return {
        type: 'sale.completed',
        id: data.transaction_id as string,
        output: {
          transactionId: data.transaction_id as string,
          createdAt: data.created_at as string,
          currency: data.currency as string,
          amount: data.amount as number,
          status: data.status as string,
          taxAmount: (data.tax_amount as number | null) ?? null,
          taxTransactionId: (data.tax_transaction_id as string | null) ?? null,
          buyer,
          products,
          coupon,
          subscription,
          gift,
          customFields,
          referrerEmail: referrer ? (referrer.email as string) : null,
          commissionEarned: (data.commission_earned as number | null) ?? null,
          commissionPaid: (data.commission_paid as boolean | null) ?? null,
          licenseKeys
        }
      };
    }
  })
  .build();
