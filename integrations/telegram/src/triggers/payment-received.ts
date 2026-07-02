import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { generateSecretToken, verifySecretToken } from '../lib/webhook-utils';
import { spec } from '../spec';

export let paymentReceivedTrigger = SlateTrigger.create(spec, {
  name: 'Payment Event',
  key: 'payment_received',
  description:
    'Triggers on payment-related events: shipping queries, pre-checkout queries, and purchased paid media.'
})
  .input(
    z.object({
      updateId: z.number().describe('Unique update identifier'),
      eventType: z.string().describe('Type of payment event'),
      paymentData: z.any().describe('Raw payment event data')
    })
  )
  .output(
    z.object({
      queryId: z
        .string()
        .optional()
        .describe('Shipping or pre-checkout query ID (use to answer)'),
      fromUserId: z.number().describe('User ID of the buyer'),
      fromFirstName: z.string().describe('First name of the buyer'),
      fromUsername: z.string().optional().describe('Username of the buyer'),
      invoicePayload: z.string().optional().describe('Bot-specified invoice payload'),
      currency: z.string().optional().describe('Three-letter ISO 4217 currency code'),
      totalAmount: z.number().optional().describe('Total price in smallest currency units'),
      shippingAddress: z.any().optional().describe('Shipping address (shipping_query only)'),
      orderInfo: z.any().optional().describe('Order information (pre_checkout_query only)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      let secretToken = generateSecretToken();

      await client.setWebhook({
        url: ctx.input.webhookBaseUrl,
        allowedUpdates: ['shipping_query', 'pre_checkout_query', 'purchased_paid_media'],
        secretToken
      });

      return {
        registrationDetails: { secretToken }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      await client.deleteWebhook();
    },

    handleRequest: async ctx => {
      let registrationDetails = ctx.state?.registrationDetails;
      if (registrationDetails?.secretToken) {
        if (!verifySecretToken(ctx.request, registrationDetails.secretToken)) {
          return { inputs: [] };
        }
      }

      let data = (await ctx.request.json()) as any;
      let inputs: Array<{ updateId: number; eventType: string; paymentData: any }> = [];

      if (data.shipping_query) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'shipping_query',
          paymentData: data.shipping_query
        });
      } else if (data.pre_checkout_query) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'pre_checkout_query',
          paymentData: data.pre_checkout_query
        });
      } else if (data.purchased_paid_media) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'purchased_paid_media',
          paymentData: data.purchased_paid_media
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let d = ctx.input.paymentData;

      return {
        type: `payment.${ctx.input.eventType}`,
        id: `${ctx.input.updateId}`,
        output: {
          queryId: d.id,
          fromUserId: d.from.id,
          fromFirstName: d.from.first_name,
          fromUsername: d.from.username,
          invoicePayload: d.invoice_payload,
          currency: d.currency,
          totalAmount: d.total_amount,
          shippingAddress:
            ctx.input.eventType === 'shipping_query' ? d.shipping_address : undefined,
          orderInfo: ctx.input.eventType === 'pre_checkout_query' ? d.order_info : undefined
        }
      };
    }
  })
  .build();
