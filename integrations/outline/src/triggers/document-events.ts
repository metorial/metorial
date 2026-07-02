import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentWebhookEvents = [
  'documents.create',
  'documents.publish',
  'documents.unpublish',
  'documents.update',
  'documents.delete',
  'documents.permanent_delete',
  'documents.archive',
  'documents.unarchive',
  'documents.restore',
  'documents.move',
  'documents.title_change'
] as const;

export let documentEvents = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description:
    'Triggers when documents are created, updated, published, archived, deleted, moved, or otherwise modified in the workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of document event'),
      deliveryId: z.string().describe('Unique delivery ID from webhook'),
      actorId: z.string().describe('User ID who triggered the event'),
      documentId: z.string().describe('ID of the affected document'),
      model: z.any().describe('Document model data from webhook payload')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      title: z.string(),
      emoji: z.string().optional(),
      collectionId: z.string().optional(),
      parentDocumentId: z.string().optional(),
      template: z.boolean().optional(),
      publishedAt: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      archivedAt: z.string().optional(),
      revision: z.number().optional(),
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
        name: 'Slates - Document Events',
        url: ctx.input.webhookBaseUrl,
        events: [...documentWebhookEvents]
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
            documentId: body.payload?.id,
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
          documentId: ctx.input.documentId,
          title: model.title || '',
          emoji: model.emoji,
          collectionId: model.collectionId,
          parentDocumentId: model.parentDocumentId,
          template: model.template,
          publishedAt: model.publishedAt,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt,
          archivedAt: model.archivedAt,
          revision: model.revision,
          actorId: ctx.input.actorId
        }
      };
    }
  })
  .build();
