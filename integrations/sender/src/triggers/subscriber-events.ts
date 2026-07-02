import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscriberEvents = SlateTrigger.create(spec, {
  name: 'Subscriber Events',
  key: 'subscriber_events',
  description:
    'Triggers when subscriber-related events occur, including new subscriber added, subscriber data updated, subscriber unsubscribed, or subscriber added/removed from a specific group.'
})
  .input(
    z.object({
      topic: z.string().describe('The webhook topic that fired'),
      webhookId: z.string().describe('Webhook event ID'),
      subscriberEmail: z.string().optional().describe('Email of the affected subscriber'),
      subscriberData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full subscriber data from the webhook payload'),
      timestamp: z.string().describe('Timestamp of the event')
    })
  )
  .output(
    z.object({
      subscriberEmail: z.string().optional().describe('Email of the affected subscriber'),
      topic: z.string().describe('Webhook topic that triggered the event'),
      eventTimestamp: z.string().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhookIds: string[] = [];

      let topics = ['subscribers/new', 'subscribers/updated', 'subscribers/unsubscribed'];

      for (let topic of topics) {
        try {
          let result = await client.createWebhook({
            url: ctx.input.webhookBaseUrl,
            topic
          });
          webhookIds.push(result.data.id);
        } catch (_err) {
          // If webhook creation fails for a topic, continue with others
        }
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_err) {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let topic = (body.topic as string) || 'unknown';
      let eventId = String(body.id || `${Date.now()}`);
      let email = (body.email as string) || undefined;
      let timestamp = (body.created as string) || new Date().toISOString();

      return {
        inputs: [
          {
            topic,
            webhookId: eventId,
            subscriberEmail: email,
            subscriberData: body,
            timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'subscriber.event';
      let topic = ctx.input.topic;

      if (topic === 'subscribers/new') {
        eventType = 'subscriber.created';
      } else if (topic === 'subscribers/updated') {
        eventType = 'subscriber.updated';
      } else if (topic === 'subscribers/unsubscribed') {
        eventType = 'subscriber.unsubscribed';
      } else if (topic === 'groups/new-subscriber') {
        eventType = 'subscriber.added_to_group';
      } else if (topic === 'groups/unsubscribed') {
        eventType = 'subscriber.removed_from_group';
      }

      return {
        type: eventType,
        id: `${ctx.input.webhookId}-${ctx.input.timestamp}`,
        output: {
          subscriberEmail: ctx.input.subscriberEmail,
          topic: ctx.input.topic,
          eventTimestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
