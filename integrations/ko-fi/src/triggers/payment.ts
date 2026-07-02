import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { parseWebhookPayload, verifyWebhookToken } from '../lib/client';
import { spec } from '../spec';

let shopItemSchema = z.object({
  directLinkCode: z.string().describe('Unique code identifying the shop product'),
  variationName: z
    .string()
    .nullable()
    .optional()
    .describe('Name of the product variation selected, if any'),
  quantity: z.number().optional().describe('Quantity of this item purchased')
});

let shippingSchema = z.object({
  fullName: z.string().describe('Full name of the recipient'),
  streetAddress: z.string().describe('Street address for shipping'),
  city: z.string().describe('City for shipping'),
  stateOrProvince: z.string().describe('State or province for shipping'),
  postalCode: z.string().describe('Postal or ZIP code'),
  country: z.string().describe('Country name'),
  countryCode: z.string().describe('ISO country code'),
  telephone: z.string().describe('Contact telephone number')
});

let paymentEventType = z.enum(['Donation', 'Subscription', 'Shop Order', 'Commission']);

export let paymentTrigger = SlateTrigger.create(spec, {
  name: 'Payment Received',
  key: 'payment_received',
  description:
    'Triggers when a payment is made on your Ko-fi page, including donations, subscriptions, shop orders, and commissions.'
})
  .input(
    z.object({
      paymentType: paymentEventType.describe('The type of payment event'),
      messageId: z.string().describe('Unique identifier for this webhook message'),
      timestamp: z.string().describe('ISO 8601 timestamp of the payment event'),
      isPublic: z.boolean().describe('Whether the supporter made the payment public'),
      fromName: z.string().describe('Name of the supporter'),
      message: z.string().nullable().describe('Message left by the supporter'),
      amount: z.string().describe('Payment amount as a string'),
      transactionUrl: z.string().describe('URL of the Ko-fi transaction'),
      email: z.string().describe('Email address of the supporter'),
      currency: z.string().describe('Currency code of the payment'),
      isSubscriptionPayment: z.boolean().describe('Whether this is a subscription payment'),
      isFirstSubscriptionPayment: z
        .boolean()
        .describe('Whether this is the first payment of a subscription'),
      kofiTransactionId: z.string().describe('Unique Ko-fi transaction ID'),
      shopItems: z
        .array(shopItemSchema)
        .nullable()
        .describe('Shop items included in a shop order, null for non-shop events'),
      tierName: z
        .string()
        .nullable()
        .describe('Membership tier name for subscription payments, null otherwise'),
      shipping: shippingSchema
        .nullable()
        .describe('Shipping details for physical product orders, null otherwise')
    })
  )
  .output(
    z.object({
      kofiTransactionId: z.string().describe('Unique Ko-fi transaction ID'),
      paymentType: paymentEventType.describe(
        'The type of payment: Donation, Subscription, Shop Order, or Commission'
      ),
      fromName: z.string().describe('Name of the supporter who made the payment'),
      email: z.string().describe('Email address of the supporter'),
      message: z
        .string()
        .nullable()
        .describe('Message left by the supporter, null if private or empty'),
      amount: z.string().describe('Payment amount as a decimal string'),
      currency: z.string().describe('Currency code of the payment (e.g. USD, EUR)'),
      transactionUrl: z.string().describe('URL of the Ko-fi transaction page'),
      isPublic: z
        .boolean()
        .describe('Whether the supporter made the payment publicly visible'),
      isSubscriptionPayment: z
        .boolean()
        .describe('Whether this payment is part of a subscription'),
      isFirstSubscriptionPayment: z
        .boolean()
        .describe('Whether this is the first payment in a new subscription'),
      tierName: z.string().nullable().describe('Name of the membership tier, if applicable'),
      shopItems: z
        .array(shopItemSchema)
        .nullable()
        .describe('Array of shop items purchased, null for non-shop events'),
      shipping: shippingSchema
        .nullable()
        .describe('Shipping information for physical product orders'),
      timestamp: z.string().describe('ISO 8601 timestamp of the payment event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let data: Record<string, unknown>;

      if (contentType.includes('application/x-www-form-urlencoded')) {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        let rawData = params.get('data');
        if (!rawData) {
          throw new Error('Missing "data" field in form-urlencoded webhook payload');
        }
        data = JSON.parse(rawData);
      } else if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } else {
        // Try form-urlencoded first (Ko-fi's default), then JSON
        let text = await ctx.request.text();
        try {
          let params = new URLSearchParams(text);
          let rawData = params.get('data');
          if (rawData) {
            data = JSON.parse(rawData);
          } else {
            data = JSON.parse(text);
          }
        } catch {
          data = JSON.parse(text);
        }
      }

      let payload = parseWebhookPayload(data);

      if (!verifyWebhookToken(payload, ctx.auth.token)) {
        throw new Error('Webhook verification failed: invalid verification token');
      }

      let shopItems = payload.shop_items
        ? payload.shop_items.map(item => ({
            directLinkCode: item.direct_link_code,
            variationName: item.variation_name ?? null,
            quantity: item.quantity
          }))
        : null;

      let shipping = payload.shipping
        ? {
            fullName: payload.shipping.full_name,
            streetAddress: payload.shipping.street_address,
            city: payload.shipping.city,
            stateOrProvince: payload.shipping.state_or_province,
            postalCode: payload.shipping.postal_code,
            country: payload.shipping.country,
            countryCode: payload.shipping.country_code,
            telephone: payload.shipping.telephone
          }
        : null;

      return {
        inputs: [
          {
            paymentType: payload.type,
            messageId: payload.message_id,
            timestamp: payload.timestamp,
            isPublic: payload.is_public,
            fromName: payload.from_name,
            message: payload.message,
            amount: payload.amount,
            transactionUrl: payload.url,
            email: payload.email,
            currency: payload.currency,
            isSubscriptionPayment: payload.is_subscription_payment,
            isFirstSubscriptionPayment: payload.is_first_subscription_payment,
            kofiTransactionId: payload.kofi_transaction_id,
            shopItems,
            tierName: payload.tier_name,
            shipping
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let typeMap: Record<string, string> = {
        Donation: 'payment.donation',
        Subscription: 'payment.subscription',
        'Shop Order': 'payment.shop_order',
        Commission: 'payment.commission'
      };

      let eventType = typeMap[ctx.input.paymentType] || 'payment.unknown';

      return {
        type: eventType,
        id: ctx.input.messageId,
        output: {
          kofiTransactionId: ctx.input.kofiTransactionId,
          paymentType: ctx.input.paymentType,
          fromName: ctx.input.fromName,
          email: ctx.input.email,
          message: ctx.input.message,
          amount: ctx.input.amount,
          currency: ctx.input.currency,
          transactionUrl: ctx.input.transactionUrl,
          isPublic: ctx.input.isPublic,
          isSubscriptionPayment: ctx.input.isSubscriptionPayment,
          isFirstSubscriptionPayment: ctx.input.isFirstSubscriptionPayment,
          tierName: ctx.input.tierName,
          shopItems: ctx.input.shopItems,
          shipping: ctx.input.shipping,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
