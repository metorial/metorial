import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentWebhookEvents = ['comments.create', 'comments.update', 'comments.delete'] as const;

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description: 'Triggers when comments are created, updated, or deleted on documents.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of comment event'),
      deliveryId: z.string().describe('Unique delivery ID from webhook'),
      actorId: z.string().describe('User ID who triggered the event'),
      commentId: z.string().describe('ID of the affected comment'),
      model: z.any().describe('Comment model data from webhook payload')
    })
  )
  .output(
    z.object({
      commentId: z.string(),
      documentId: z.string().optional(),
      parentCommentId: z.string().optional(),
      content: z.any().optional(),
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
        name: 'Slates - Comment Events',
        url: ctx.input.webhookBaseUrl,
        events: [...commentWebhookEvents]
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
            commentId: body.payload?.id,
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
          commentId: ctx.input.commentId,
          documentId: model.documentId,
          parentCommentId: model.parentCommentId,
          content: model.data,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
