import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let PAYMENT_EVENT_TYPES = ['payment.changed'] as const;

export let paymentEvents = SlateTrigger.create(spec, {
  name: 'Payment Events',
  key: 'payment_events',
  description: 'Triggers when payment information changes in Lexoffice.'
})
  .input(
    z.object({
      eventType: z.string().describe('The Lexoffice event type (payment.changed)'),
      resourceId: z.string().describe('The payment resource ID'),
      organizationId: z.string().describe('The organization ID'),
      eventDate: z.string().describe('ISO timestamp of the event')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('The payment resource ID'),
      eventType: z.string().describe('The event type that occurred'),
      openAmount: z.number().optional().describe('Remaining open amount'),
      paymentStatus: z.string().optional().describe('Current payment status'),
      currency: z.string().optional().describe('Currency code')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptions: { subscriptionId: string; eventType: string }[] = [];

      for (let eventType of PAYMENT_EVENT_TYPES) {
        let sub = await client.createEventSubscription(eventType, ctx.input.webhookBaseUrl);
        subscriptions.push({ subscriptionId: sub.subscriptionId, eventType });
      }

      return {
        registrationDetails: { subscriptions }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subs = ctx.input.registrationDetails?.subscriptions ?? [];

      for (let sub of subs) {
        try {
          await client.deleteEventSubscription(sub.subscriptionId);
        } catch (_e) {
          /* ignore cleanup errors */
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.eventType,
            resourceId: body.resourceId,
            organizationId: body.organizationId,
            eventDate: body.eventDate
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let openAmount: number | undefined;
      let paymentStatus: string | undefined;
      let currency: string | undefined;

      try {
        let payment = await client.getPayment(ctx.input.resourceId);
        openAmount = payment.openAmount;
        paymentStatus = payment.paymentStatus ?? payment.status;
        currency = payment.currency;
      } catch (_e) {
        /* resource may not be accessible */
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.resourceId}-${ctx.input.eventDate}`,
        output: {
          resourceId: ctx.input.resourceId,
          eventType: ctx.input.eventType,
          openAmount,
          paymentStatus,
          currency
        }
      };
    }
  })
  .build();
