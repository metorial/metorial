import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { spec } from '../spec';

export let checkoutEvents = SlateTrigger.create(spec, {
  name: 'Checkout Events',
  key: 'checkout_events',
  description:
    'Triggered when a Checkout session is completed or expires. Use this to fulfill orders, activate services, or handle abandoned checkouts.'
})
  .input(
    z.object({
      eventId: z.string().describe('Stripe event ID'),
      eventType: z
        .string()
        .describe('Event type (checkout.session.completed or checkout.session.expired)'),
      resourceId: z.string().describe('Checkout session ID'),
      resource: z.any().describe('Full checkout session object from the event'),
      created: z.number().describe('Event creation timestamp')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Checkout session ID'),
      customerId: z.string().optional().nullable().describe('Customer ID'),
      customerEmail: z.string().optional().nullable().describe('Customer email'),
      mode: z.string().describe('Checkout mode (payment, subscription, setup)'),
      paymentStatus: z.string().describe('Payment status'),
      status: z.string().nullable().describe('Session status'),
      amountTotal: z.number().optional().nullable().describe('Total amount'),
      currency: z.string().optional().nullable().describe('Currency code'),
      paymentIntentId: z
        .string()
        .optional()
        .nullable()
        .describe('Associated PaymentIntent ID'),
      subscriptionId: z.string().optional().nullable().describe('Associated subscription ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new StripeClient({
        token: ctx.auth.token,
        stripeAccountId: ctx.config.stripeAccountId
      });

      let result = await client.createWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        enabled_events: [
          'checkout.session.completed',
          'checkout.session.expired',
          'checkout.session.async_payment_succeeded',
          'checkout.session.async_payment_failed'
        ]
      });

      return {
        registrationDetails: {
          webhookEndpointId: result.id,
          secret: result.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new StripeClient({
        token: ctx.auth.token,
        stripeAccountId: ctx.config.stripeAccountId
      });

      await client.deleteWebhookEndpoint(ctx.input.registrationDetails.webhookEndpointId);
    },

    handleRequest: async ctx => {
      let body: any = await ctx.request.json();

      if (!body?.type || !body.data?.object) {
        return { inputs: [] };
      }

      let obj = body.data.object;

      return {
        inputs: [
          {
            eventId: body.id,
            eventType: body.type,
            resourceId: obj.id,
            resource: obj,
            created: body.created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { resource } = ctx.input;
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          sessionId: ctx.input.resourceId,
          customerId: resource.customer || null,
          customerEmail: resource.customer_email || resource.customer_details?.email || null,
          mode: resource.mode,
          paymentStatus: resource.payment_status,
          status: resource.status,
          amountTotal: resource.amount_total,
          currency: resource.currency,
          paymentIntentId: resource.payment_intent || null,
          subscriptionId: resource.subscription || null
        }
      };
    }
  })
  .build();
