import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let attachmentEventTypes = [
  'attachment_created',
  'attachment_updated',
  'attachment_removed',
  'attachment_trashed',
  'attachment_restored',
  'attachment_archived',
  'attachment_unarchived',
  'attachment_viewed'
] as const;

export let attachmentEvents = SlateTrigger.create(spec, {
  name: 'Attachment Events',
  key: 'attachment_events',
  description:
    'Triggered when attachments are created, updated, removed, trashed, restored, archived, unarchived, or viewed.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of attachment event'),
      attachmentId: z.string().describe('The attachment ID'),
      contentId: z.string().optional().describe('The parent content ID'),
      timestamp: z.string().describe('When the event occurred'),
      userAccountId: z.string().optional().describe('The user who triggered the event'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      attachmentId: z.string().describe('The attachment ID'),
      fileName: z.string().optional().describe('The file name'),
      contentId: z.string().optional().describe('The parent content ID'),
      authorId: z.string().optional().describe('The user who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);

      let result = await client.registerWebhook({
        name: 'Slates Attachment Events',
        url: ctx.input.webhookBaseUrl,
        events: [...attachmentEventTypes]
      });

      return {
        registrationDetails: { webhookId: String(result.id || result) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);
      await client.unregisterWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.eventType || 'unknown';
      let attachmentId = data.attachment?.id || data.content?.id || data.id || '';
      let contentId = data.attachment?.container?.id || data.content?.container?.id;
      let timestamp = data.timestamp ? String(data.timestamp) : new Date().toISOString();
      let userAccountId = data.userAccountId || data.user?.accountId;

      return {
        inputs: [
          {
            eventType: String(eventType),
            attachmentId: String(attachmentId),
            contentId: contentId ? String(contentId) : undefined,
            timestamp,
            userAccountId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `attachment.${ctx.input.eventType.replace('attachment_', '')}`,
        id: `${ctx.input.attachmentId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          attachmentId: ctx.input.attachmentId,
          fileName:
            ctx.input.rawPayload?.attachment?.title || ctx.input.rawPayload?.content?.title,
          contentId: ctx.input.contentId,
          authorId: ctx.input.userAccountId
        }
      };
    }
  })
  .build();
