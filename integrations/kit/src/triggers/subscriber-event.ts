import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscriberEvent = SlateTrigger.create(spec, {
  name: 'Subscriber Event',
  key: 'subscriber_event',
  description:
    'Triggers when subscriber events occur, including activation, unsubscribe, bounce, complaint, form subscription, sequence events, link clicks, product purchases, and tag changes.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Kit event name'),
      subscriberId: z.number().describe('Subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      state: z.string().describe('Subscriber state'),
      createdAt: z.string().describe('When the subscriber was created'),
      fields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      state: z.string().describe('Subscriber state'),
      createdAt: z.string().describe('When the subscriber was created'),
      fields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let events = [
        { name: 'subscriber.subscriber_activate' },
        { name: 'subscriber.subscriber_unsubscribe' },
        { name: 'subscriber.subscriber_bounce' },
        { name: 'subscriber.subscriber_complain' }
      ];

      let registeredWebhooks: Array<{ webhookId: number; eventName: string }> = [];

      for (let event of events) {
        let result = await client.createWebhook(ctx.input.webhookBaseUrl, event);
        registeredWebhooks.push({
          webhookId: result.webhook.id,
          eventName: event.name
        });
      }

      return {
        registrationDetails: { webhooks: registeredWebhooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhooks = ctx.input.registrationDetails?.webhooks as
        | Array<{ webhookId: number }>
        | undefined;

      if (webhooks) {
        for (let wh of webhooks) {
          try {
            await client.deleteWebhook(wh.webhookId);
          } catch {
            // Webhook may already be deleted
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let subscriber = data.subscriber || {};
      let eventName = data.event_name || data.name || 'subscriber.unknown';

      return {
        inputs: [
          {
            eventName,
            subscriberId: subscriber.id ?? 0,
            emailAddress: subscriber.email_address ?? '',
            firstName: subscriber.first_name ?? null,
            state: subscriber.state ?? 'unknown',
            createdAt: subscriber.created_at ?? new Date().toISOString(),
            fields: subscriber.fields,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventName
        .replace('subscriber.', '')
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase();

      return {
        type: `subscriber.${eventType}`,
        id: `${ctx.input.eventName}-${ctx.input.subscriberId}-${Date.now()}`,
        output: {
          subscriberId: ctx.input.subscriberId,
          emailAddress: ctx.input.emailAddress,
          firstName: ctx.input.firstName,
          state: ctx.input.state,
          createdAt: ctx.input.createdAt,
          fields: ctx.input.fields
        }
      };
    }
  })
  .build();
