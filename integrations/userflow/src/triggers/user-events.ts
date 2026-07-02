import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when a user is created or updated in Userflow. For updates, includes both previous and updated attributes.'
})
  .input(
    z.object({
      topic: z.string().describe('The webhook topic (e.g. user.created, user.updated)'),
      userId: z.string().describe('ID of the affected user'),
      attributes: z.record(z.string(), z.unknown()).describe('Current user attributes'),
      previousAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Previous attributes (for updates)'),
      updatedAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Changed attributes (for updates)'),
      createdAt: z.string().describe('Timestamp of the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      attributes: z.record(z.string(), z.unknown()).describe('Current user attributes'),
      previousAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Previous attribute values (only for user.updated)'),
      updatedAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Changed attribute values (only for user.updated)'),
      createdAt: z.string().describe('Timestamp of the user record')
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
        topics: ['user'],
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
      let user = body.user as Record<string, unknown> | undefined;
      let data = user || (body.data as Record<string, unknown>);

      if (!data || !topic?.startsWith('user.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            topic,
            userId: data.id as string,
            attributes: (data.attributes || {}) as Record<string, unknown>,
            previousAttributes: body.previous_attributes as
              | Record<string, unknown>
              | undefined,
            updatedAttributes: body.updated_attributes as Record<string, unknown> | undefined,
            createdAt: data.created_at as string
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.topic,
        id: `${ctx.input.topic}_${ctx.input.userId}_${ctx.input.createdAt}`,
        output: {
          userId: ctx.input.userId,
          attributes: ctx.input.attributes,
          previousAttributes: ctx.input.previousAttributes,
          updatedAttributes: ctx.input.updatedAttributes,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
