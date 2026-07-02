import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let fileEvents = SlateTrigger.create(spec, {
  name: 'File Events',
  key: 'file_events',
  description: 'Triggers when a file is uploaded or deleted on an entity in Affinity.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event (file.created or file.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      entityFileId: z.number().describe('ID of the file'),
      name: z.string().nullable().describe('File name'),
      size: z.number().nullable().describe('File size in bytes'),
      personId: z.number().nullable().describe('Associated person ID'),
      organizationId: z.number().nullable().describe('Associated organization ID'),
      opportunityId: z.number().nullable().describe('Associated opportunity ID'),
      uploaderId: z.number().nullable().describe('ID of the uploader')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: ['file.created', 'file.deleted']
      });
      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let type = data.type as string;
      if (!type?.startsWith('file.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: type,
            eventId: `${type}-${data.body?.id ?? ''}-${data.sent_at ?? Date.now()}`,
            sentAt: data.sent_at ?? null,
            body: data.body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let body = ctx.input.body ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          entityFileId: body.id ?? 0,
          name: body.name ?? null,
          size: body.size ?? null,
          personId: body.person_id ?? null,
          organizationId: body.organization_id ?? null,
          opportunityId: body.opportunity_id ?? null,
          uploaderId: body.uploader_id ?? null
        }
      };
    }
  })
  .build();
