import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { LinearClient } from '../lib/client';
import { linearServiceError } from '../lib/errors';
import { spec } from '../spec';

export let documentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Document Events',
  key: 'document_events',
  description: 'Triggers when documents are created, updated, or removed in Linear.'
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'remove']).describe('The action that occurred'),
      webhookId: z.string().describe('Delivery ID from the webhook'),
      documentId: z.string().describe('Document ID'),
      documentData: z.any().describe('Full document data from webhook payload'),
      updatedFrom: z.any().optional().describe('Previous values for updated fields')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      title: z.string().nullable().describe('Document title'),
      content: z.string().nullable().describe('Document content'),
      url: z.string().nullable().describe('Document URL'),
      icon: z.string().nullable().describe('Document icon'),
      color: z.string().nullable().describe('Document color'),
      projectId: z.string().nullable().describe('Associated project ID'),
      creatorId: z.string().nullable().describe('Creator user ID'),
      createdAt: z.string().nullable(),
      updatedAt: z.string().nullable(),
      previousValues: z.any().nullable().describe('Previous field values (on update)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resourceTypes: ['Document'],
        allPublicTeams: true
      });

      if (!result.success) {
        throw linearServiceError('Failed to register webhook');
      }

      return {
        registrationDetails: {
          webhookId: result.webhook.id,
          secret: result.webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new LinearClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let deliveryId = ctx.request.headers.get('Linear-Delivery') || body.webhookId || '';
      let eventType = ctx.request.headers.get('Linear-Event') || '';

      if (eventType !== 'Document' && body.type !== 'Document') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            action: body.action,
            webhookId: deliveryId,
            documentId: body.data?.id || '',
            documentData: body.data,
            updatedFrom: body.updatedFrom
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.documentData || {};

      return {
        type: `document.${ctx.input.action}`,
        id: ctx.input.webhookId,
        output: {
          documentId: data.id || ctx.input.documentId,
          title: data.title || null,
          content: data.content || null,
          url: data.url || null,
          icon: data.icon || null,
          color: data.color || null,
          projectId: data.projectId || data.project?.id || null,
          creatorId: data.creatorId || data.creator?.id || null,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
          previousValues: ctx.input.updatedFrom || null
        }
      };
    }
  })
  .build();
