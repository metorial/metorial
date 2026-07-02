import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { spec } from '../spec';

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description:
    'Triggered when payment-related events occur, including PaymentIntent, Charge, and Refund lifecycle changes such as creation, success, failure, and refunds.'
})
  .input(
    z.object({
      eventId: z.string().describe('Stripe event ID'),
      eventType: z.string().describe('Event type (e.g., payment_intent.succeeded)'),
      resourceId: z.string().describe('ID of the affected resource'),
      resourceType: z.string().describe('Type of the affected resource'),
      resource: z.any().describe('Full resource object from the event'),
      created: z.number().describe('Event creation timestamp')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('ID of the payment resource'),
      resourceType: z.string().describe('Type of resource (payment_intent, charge, refund)'),
      amount: z.number().optional().describe('Amount in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      status: z.string().optional().describe('Current status of the resource'),
      customerId: z.string().optional().nullable().describe('Associated customer ID'),
      description: z.string().optional().nullable().describe('Description'),
      failureMessage: z
        .string()
        .optional()
        .nullable()
        .describe('Failure message if applicable'),
      receiptUrl: z.string().optional().nullable().describe('Receipt URL (for charges)'),
      created: z.number().optional().describe('Resource creation timestamp')
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
          'payment_intent.created',
          'payment_intent.succeeded',
          'payment_intent.payment_failed',
          'payment_intent.canceled',
          'payment_intent.requires_action',
          'payment_intent.amount_capturable_updated',
          'charge.succeeded',
          'charge.failed',
          'charge.refunded',
          'charge.captured',
          'charge.updated',
          'charge.dispute.created',
          'charge.dispute.closed',
          'refund.created',
          'refund.updated',
          'refund.failed'
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
            resourceType: obj.object || body.type.split('.')[0],
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
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          amount: resource.amount,
          currency: resource.currency,
          status: resource.status,
          customerId: resource.customer || null,
          description: resource.description || null,
          failureMessage:
            resource.failure_message || resource.last_payment_error?.message || null,
          receiptUrl: resource.receipt_url || null,
          created: resource.created
        }
      };
    }
  })
  .build();
