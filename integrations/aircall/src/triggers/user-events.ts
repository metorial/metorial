import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userEventTypes = [
  'user.created',
  'user.deleted',
  'user.opened',
  'user.closed',
  'user.connected',
  'user.disconnected',
  'user.wut_start',
  'user.wut_end'
] as const;

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when user events occur including creation, deletion, and online/offline status changes (opened/closed, connected/disconnected, wrap-up time start/end).'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of user event'),
      timestamp: z.number().describe('Event timestamp as UNIX timestamp'),
      webhookToken: z.string().describe('Webhook verification token'),
      user: z.any().describe('The user data from the event payload')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('Unique user identifier'),
      name: z.string().describe('Full name of the user'),
      email: z.string().describe('Email address'),
      available: z.boolean().describe('Whether the user is available'),
      availabilityStatus: z.string().nullable().describe('Availability status'),
      createdAt: z.string().nullable().describe('Creation date as ISO string')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let webhook = await client.createWebhook(
        ctx.input.webhookBaseUrl,
        [...userEventTypes],
        'slates-user-events'
      );
      return {
        registrationDetails: {
          webhookId: webhook.webhook_id,
          token: webhook.token
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (data.resource !== 'user') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: data.event,
            timestamp: data.timestamp,
            webhookToken: data.token || '',
            user: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let user = ctx.input.user;

      return {
        type: ctx.input.eventType,
        id: `${user.id}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          userId: user.id,
          name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email || '',
          available: user.available ?? false,
          availabilityStatus: user.availability_status ?? null,
          createdAt: user.created_at ? new Date(user.created_at * 1000).toISOString() : null
        }
      };
    }
  })
  .build();
