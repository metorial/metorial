import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let subscriberEvent = SlateTrigger.create(spec, {
  name: 'Subscriber Event',
  key: 'subscriber_event',
  description:
    'Fires when a subscriber is activated, unsubscribes, bounces, or marks an email as spam.'
})
  .input(
    z.object({
      eventName: z.string().describe('The webhook event name'),
      subscriberId: z.number().describe('Subscriber ID'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      emailAddress: z.string().describe('Subscriber email address'),
      state: z.string().describe('Subscriber state'),
      createdAt: z.string().describe('Subscriber creation timestamp'),
      fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Subscriber ID'),
      firstName: z.string().nullable().describe('First name'),
      emailAddress: z.string().describe('Email address'),
      state: z.string().describe('Current subscriber state'),
      createdAt: z.string().describe('When the subscriber was created'),
      fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth);

      let eventNames = [
        'subscriber.subscriber_activate',
        'subscriber.subscriber_unsubscribe',
        'subscriber.subscriber_bounce',
        'subscriber.subscriber_complain'
      ];

      let webhookIds: number[] = [];
      for (let eventName of eventNames) {
        let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, {
          name: eventName
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth);
      let details = ctx.input.registrationDetails as { webhookIds: number[] };

      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as any;
      let subscriber = body.subscriber;

      if (!subscriber) {
        return { inputs: [] };
      }

      // Determine event name from the webhook payload or URL
      let eventName = body.event_name || body.name || 'subscriber.unknown';

      return {
        inputs: [
          {
            eventName,
            subscriberId: subscriber.id,
            firstName: subscriber.first_name || null,
            emailAddress: subscriber.email_address,
            state: subscriber.state,
            createdAt: subscriber.created_at,
            fields: subscriber.fields || {}
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'subscriber.unknown';
      let name = ctx.input.eventName;
      if (name.includes('activate')) eventType = 'subscriber.activated';
      else if (name.includes('unsubscribe')) eventType = 'subscriber.unsubscribed';
      else if (name.includes('bounce')) eventType = 'subscriber.bounced';
      else if (name.includes('complain')) eventType = 'subscriber.complained';

      return {
        type: eventType,
        id: `${eventType}-${ctx.input.subscriberId}-${Date.now()}`,
        output: {
          subscriberId: ctx.input.subscriberId,
          firstName: ctx.input.firstName,
          emailAddress: ctx.input.emailAddress,
          state: ctx.input.state,
          createdAt: ctx.input.createdAt,
          fields: ctx.input.fields
        }
      };
    }
  });
