import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let paymentNotification = SlateTrigger.create(spec, {
  name: 'Payment Notification',
  key: 'payment_notification',
  description:
    'Receive webhook notifications when payments are made, payouts are sent, or transfers occur. Covers all payment lifecycle events including completed, partial, pending, and payout statuses.'
})
  .input(
    z.object({
      paymentId: z.string().describe('Unique payment identifier'),
      amount: z.string().describe('Payment amount'),
      paymentMethod: z
        .string()
        .describe('Payment method used (e.g., "solana", "bitcoin", "paypal")'),
      currency: z.string().describe('Fiat currency (e.g., "usd")'),
      status: z
        .string()
        .describe('Payment status (e.g., "yes", "pending", "payout", "paid_partial")'),
      customerName: z.string().optional().describe('Customer name'),
      customerEmail: z.string().optional().describe('Customer email'),
      items: z.string().optional().describe('Items purchased'),
      quantities: z.string().optional().describe('Item quantities'),
      date: z.string().optional().describe('Transaction date'),
      note: z.string().optional().describe('Custom notes or form data'),
      metadata: z.any().optional().describe('Custom metadata'),
      shippingAddress: z
        .object({
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipcode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Shipping address if collected'),
      signature: z.string().optional().describe('Webhook signature for validation')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('Unique payment identifier'),
      amount: z.string().describe('Payment amount'),
      paymentMethod: z.string().describe('Payment method used'),
      currency: z.string().describe('Fiat currency'),
      status: z.string().describe('Payment status'),
      customerName: z.string().optional().describe('Customer name'),
      customerEmail: z.string().optional().describe('Customer email'),
      items: z.string().optional().describe('Items purchased'),
      quantities: z.string().optional().describe('Item quantities'),
      date: z.string().optional().describe('Transaction date'),
      note: z.string().optional().describe('Custom notes or form data'),
      metadata: z.any().optional().describe('Custom metadata'),
      shippingAddress: z
        .object({
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipcode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Shipping address if collected')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PoofClient({ token: ctx.auth.token });
      let result = await client.createWebhook({ url: ctx.input.webhookBaseUrl });
      return {
        registrationDetails: {
          webhookUrl: ctx.input.webhookBaseUrl,
          raw: result
        }
      };
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as Record<string, unknown>;

      let _statusMap: Record<string, string> = {
        yes: 'payment.completed',
        payout: 'payment.payout',
        paid_partial: 'payment.partial',
        transfer_out: 'payment.transfer_out',
        pending: 'payment.pending',
        transfer_in: 'payment.transfer_in',
        hold: 'payment.hold'
      };

      let status = (body.paid as string) || 'unknown';
      let shippingAddr = body.street_address as Record<string, string> | undefined;

      return {
        inputs: [
          {
            paymentId: (body.payment_id as string) || '',
            amount: (body.amount as string) || '',
            paymentMethod: (body.payment_method as string) || '',
            currency: (body.currency as string) || '',
            status,
            customerName: body.name as string | undefined,
            customerEmail: body.email as string | undefined,
            items: body.items as string | undefined,
            quantities: body.quantities as string | undefined,
            date: body.date as string | undefined,
            note: body.note as string | undefined,
            metadata: body.metadata,
            shippingAddress: shippingAddr
              ? {
                  address: shippingAddr.address,
                  city: shippingAddr.city,
                  state: shippingAddr.state,
                  zipcode: shippingAddr.zipcode,
                  country: shippingAddr.country
                }
              : undefined,
            signature: body['x-poof-signature'] as string | undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let statusMap: Record<string, string> = {
        yes: 'payment.completed',
        payout: 'payment.payout',
        paid_partial: 'payment.partial',
        transfer_out: 'payment.transfer_out',
        pending: 'payment.pending',
        transfer_in: 'payment.transfer_in',
        hold: 'payment.hold'
      };

      let eventType = statusMap[ctx.input.status] || `payment.${ctx.input.status}`;

      return {
        type: eventType,
        id: ctx.input.paymentId,
        output: {
          paymentId: ctx.input.paymentId,
          amount: ctx.input.amount,
          paymentMethod: ctx.input.paymentMethod,
          currency: ctx.input.currency,
          status: ctx.input.status,
          customerName: ctx.input.customerName,
          customerEmail: ctx.input.customerEmail,
          items: ctx.input.items,
          quantities: ctx.input.quantities,
          date: ctx.input.date,
          note: ctx.input.note,
          metadata: ctx.input.metadata,
          shippingAddress: ctx.input.shippingAddress
        }
      };
    }
  })
  .build();
