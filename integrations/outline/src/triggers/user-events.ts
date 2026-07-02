import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userWebhookEvents = [
  'users.create',
  'users.signin',
  'users.update',
  'users.suspend',
  'users.activate',
  'users.delete',
  'users.invite',
  'users.promote',
  'users.demote'
] as const;

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when users are created, invited, suspended, activated, promoted, demoted, or otherwise modified in the workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of user event'),
      deliveryId: z.string().describe('Unique delivery ID from webhook'),
      actorId: z.string().describe('User ID who triggered the event'),
      userId: z.string().describe('ID of the affected user'),
      model: z.any().describe('User model data from webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      name: z.string(),
      email: z.string().optional(),
      role: z.string().optional(),
      isSuspended: z.boolean().optional(),
      isAdmin: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      actorId: z.string()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let subscription = await client.createWebhookSubscription({
        name: 'Slates - User Events',
        url: ctx.input.webhookBaseUrl,
        events: [...userWebhookEvents]
      });

      return {
        registrationDetails: {
          webhookSubscriptionId: subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let details = ctx.input.registrationDetails as { webhookSubscriptionId: string };
      await client.deleteWebhookSubscription(details.webhookSubscriptionId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        id: string;
        event: string;
        actorId: string;
        payload: {
          id: string;
          model: any;
        };
      };

      return {
        inputs: [
          {
            eventType: body.event,
            deliveryId: body.id,
            actorId: body.actorId,
            userId: body.payload?.id,
            model: body.payload?.model
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let model = ctx.input.model || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.deliveryId,
        output: {
          userId: ctx.input.userId,
          name: model.name || '',
          email: model.email,
          role: model.role,
          isSuspended: model.isSuspended,
          isAdmin: model.isAdmin,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
