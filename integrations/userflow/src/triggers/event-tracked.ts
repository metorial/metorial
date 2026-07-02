import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let eventTracked = SlateTrigger.create(spec, {
  name: 'Event Tracked',
  key: 'event_tracked',
  description:
    'Triggers when any event is tracked for a user or group in Userflow. Covers all event types including flow events, checklist events, launcher events, and custom tracked events.'
})
  .input(
    z.object({
      topic: z
        .string()
        .describe(
          'The webhook topic (e.g. event.tracked, event.tracked.subscription_activated)'
        ),
      eventId: z.string().describe('ID of the tracked event'),
      eventName: z.string().describe('Name of the event'),
      userId: z.string().nullable().describe('ID of the associated user'),
      groupId: z.string().nullable().describe('ID of the associated group'),
      attributes: z.record(z.string(), z.unknown()).describe('Event attributes'),
      time: z.string().describe('Timestamp when the event occurred')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('ID of the tracked event'),
      eventName: z
        .string()
        .describe('Name of the event (e.g. subscription_activated, flow_completed)'),
      userId: z.string().nullable().describe('ID of the associated user'),
      groupId: z.string().nullable().describe('ID of the associated group'),
      attributes: z.record(z.string(), z.unknown()).describe('Event attributes'),
      time: z.string().describe('Timestamp when the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiVersion: ctx.config.apiVersion
      });

      let subscription = await client.createWebhookSubscription({
        url: ctx.input.webhookBaseUrl,
        topics: ['event'],
        apiVersion: ctx.config.apiVersion
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          secret: subscription.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiVersion: ctx.config.apiVersion
      });

      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let topic = body.topic as string;
      let event = body.event as Record<string, unknown> | undefined;
      let data = event || (body.data as Record<string, unknown>);

      if (!data || !topic?.startsWith('event.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            topic,
            eventId: data.id as string,
            eventName: data.name as string,
            userId: (data.user_id as string) || null,
            groupId: (data.group_id as string) || null,
            attributes: (data.attributes || {}) as Record<string, unknown>,
            time: (data.time || data.created_at) as string
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `event.tracked.${ctx.input.eventName}`,
        id: ctx.input.eventId,
        output: {
          eventId: ctx.input.eventId,
          eventName: ctx.input.eventName,
          userId: ctx.input.userId,
          groupId: ctx.input.groupId,
          attributes: ctx.input.attributes,
          time: ctx.input.time
        }
      };
    }
  })
  .build();
