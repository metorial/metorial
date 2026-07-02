import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collectionWebhookEvents = [
  'collections.create',
  'collections.update',
  'collections.delete',
  'collections.archive',
  'collections.restore',
  'collections.move',
  'collections.permission_changed',
  'collections.add_user',
  'collections.remove_user',
  'collections.add_group',
  'collections.remove_group'
] as const;

export let collectionEvents = SlateTrigger.create(spec, {
  name: 'Collection Events',
  key: 'collection_events',
  description:
    'Triggers when collections are created, updated, deleted, archived, or when membership changes occur.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of collection event'),
      deliveryId: z.string().describe('Unique delivery ID from webhook'),
      actorId: z.string().describe('User ID who triggered the event'),
      collectionId: z.string().describe('ID of the affected collection'),
      model: z.any().describe('Collection model data from webhook payload')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      color: z.string().optional(),
      permission: z.string().optional(),
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
        name: 'Slates - Collection Events',
        url: ctx.input.webhookBaseUrl,
        events: [...collectionWebhookEvents]
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
            collectionId: body.payload?.id,
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
          collectionId: ctx.input.collectionId,
          name: model.name || '',
          description: model.description,
          color: model.color,
          permission: model.permission,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
