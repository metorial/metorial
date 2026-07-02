import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let labelEvents = SlateTrigger.create(spec, {
  name: 'Label Events',
  key: 'label_events',
  description:
    'Triggered when labels are added to or removed from content, or when labels are created or deleted globally.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of label event'),
      labelName: z.string().optional().describe('The label name'),
      contentId: z
        .string()
        .optional()
        .describe('The content ID the label was added to or removed from'),
      timestamp: z.string().describe('When the event occurred'),
      userAccountId: z.string().optional().describe('The user who triggered the event'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      labelName: z.string().optional().describe('The label name'),
      contentId: z.string().optional().describe('The affected content ID'),
      contentTitle: z.string().optional().describe('The affected content title'),
      authorId: z.string().optional().describe('The user who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth, ctx.config);

      let result = await client.registerWebhook({
        name: 'Slates Label Events',
        url: ctx.input.webhookBaseUrl,
        events: ['label_added', 'label_removed', 'label_created', 'label_deleted']
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
      let labelName = data.label?.name || data.labelName;
      let contentId = data.content?.id || data.labeledContent?.id;
      let timestamp = data.timestamp ? String(data.timestamp) : new Date().toISOString();
      let userAccountId = data.userAccountId || data.user?.accountId;

      return {
        inputs: [
          {
            eventType: String(eventType),
            labelName,
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
        type: `label.${ctx.input.eventType.replace('label_', '')}`,
        id: `${ctx.input.labelName || 'unknown'}-${ctx.input.contentId || 'global'}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output: {
          labelName: ctx.input.labelName,
          contentId: ctx.input.contentId,
          contentTitle:
            ctx.input.rawPayload?.content?.title ||
            ctx.input.rawPayload?.labeledContent?.title,
          authorId: ctx.input.userAccountId
        }
      };
    }
  })
  .build();
