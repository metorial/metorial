import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { StripeClient } from '../lib/client';
import { spec } from '../spec';

export let payoutEvents = SlateTrigger.create(spec, {
  name: 'Payout Events',
  key: 'payout_events',
  description:
    'Triggered when payout events occur, including creation, success, failure, and cancellation of transfers to your bank account or debit card.'
})
  .input(
    z.object({
      eventId: z.string().describe('Stripe event ID'),
      eventType: z.string().describe('Event type (e.g., payout.paid)'),
      resourceId: z.string().describe('Payout ID'),
      resource: z.any().describe('Full payout object from the event'),
      created: z.number().describe('Event creation timestamp')
    })
  )
  .output(
    z.object({
      payoutId: z.string().describe('Payout ID'),
      amount: z.number().describe('Payout amount'),
      currency: z.string().describe('Currency code'),
      status: z.string().describe('Payout status'),
      method: z.string().optional().describe('Payout method'),
      arrivalDate: z.number().optional().describe('Estimated arrival date'),
      failureMessage: z
        .string()
        .optional()
        .nullable()
        .describe('Failure message if applicable'),
      created: z.number().optional().describe('Payout creation timestamp')
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
          'payout.created',
          'payout.paid',
          'payout.failed',
          'payout.canceled',
          'payout.updated',
          'payout.reconciliation_completed'
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
          payoutId: ctx.input.resourceId,
          amount: resource.amount,
          currency: resource.currency,
          status: resource.status,
          method: resource.method,
          arrivalDate: resource.arrival_date,
          failureMessage: resource.failure_message || null,
          created: resource.created
        }
      };
    }
  })
  .build();
