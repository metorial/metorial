import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let checkoutEventOutputSchema = z.object({
  eventId: z.string().describe('Unique event identifier'),
  summary: z.string().describe('Event title'),
  startAt: z.string().describe('Start time (ISO 8601)'),
  endAt: z.string().describe('End time (ISO 8601)'),
  duration: z.number().describe('Duration in minutes'),
  state: z.string().describe('Event state'),
  url: z.string().describe('Public event URL'),
  createdAt: z.string().describe('Creation timestamp'),
  schedulerName: z.string().nullable().optional().describe('Name of the person who booked'),
  schedulerEmail: z.string().nullable().optional().describe('Email of the person who booked'),
  payment: z
    .object({
      amountTotal: z.number().optional().describe('Total amount in smallest currency unit'),
      state: z.string().optional().describe('Payment state'),
      url: z.string().nullable().optional().describe('Payment URL')
    })
    .nullable()
    .optional()
    .describe('Payment details'),
  linkId: z.string().nullable().optional().describe('Scheduling link ID'),
  linkName: z.string().nullable().optional().describe('Scheduling link name'),
  metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata')
});

export let eventCheckoutTrigger = SlateTrigger.create(spec, {
  name: 'Event Checkout',
  key: 'event_checkout',
  description:
    'Triggers when a paid event checkout status changes: pending, completed, or expired.'
})
  .input(
    z.object({
      webhookEventType: z.string().describe('Webhook event type'),
      webhookEventId: z.string().describe('Webhook payload ID'),
      occurredAt: z.string().describe('When the event occurred'),
      eventPayload: z.any().describe('Raw event payload')
    })
  )
  .output(checkoutEventOutputSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({ url: ctx.input.webhookBaseUrl });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let checkoutTypes = [
        'event.checkout.pending',
        'event.checkout.expired',
        'event.checkout.completed'
      ];

      if (!checkoutTypes.includes(data.type)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            webhookEventType: data.type,
            webhookEventId: data.id,
            occurredAt: data.occurred_at,
            eventPayload: data.payload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let e = ctx.input.eventPayload;

      return {
        type: ctx.input.webhookEventType,
        id: ctx.input.webhookEventId,
        output: {
          eventId: e.id,
          summary: e.summary,
          startAt: e.start_at,
          endAt: e.end_at,
          duration: e.duration,
          state: e.state,
          url: e.url,
          createdAt: e.created_at,
          schedulerName: e.scheduler?.display_name,
          schedulerEmail: e.scheduler?.email,
          payment: e.payment
            ? {
                amountTotal: e.payment.amount_total,
                state: e.payment.state,
                url: e.payment.url
              }
            : null,
          linkId: e.link?.id,
          linkName: e.link?.name,
          metadata: e.metadata
        }
      };
    }
  })
  .build();
