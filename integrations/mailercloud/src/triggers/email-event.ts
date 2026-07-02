import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailEventType = z.enum([
  'send',
  'open',
  'click',
  'fail',
  'spam',
  'unsubscribe',
  'bounce'
]);

export let emailEvent = SlateTrigger.create(spec, {
  name: 'Email Event',
  key: 'email_event',
  description:
    'Triggers when an email event occurs, such as send, open, click, fail, spam, unsubscribe, or bounce. Receives real-time notifications via webhook from Mailercloud.'
})
  .input(
    z.object({
      eventType: emailEventType.describe('Type of email event'),
      recipientEmail: z.string().optional().describe('Email address of the recipient'),
      campaignName: z.string().optional().describe('Name of the campaign'),
      campaignId: z.string().optional().describe('ID of the campaign'),
      tagName: z.string().optional().describe('Tag name associated with the campaign'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      url: z.string().optional().describe('Clicked URL (for click events)'),
      reason: z.string().optional().describe('Reason for failure/bounce/spam'),
      listId: z.string().optional().describe('List ID (for unsubscribe events)'),
      recipients: z
        .array(z.string())
        .optional()
        .describe('Array of recipient emails (for send events batched in groups of 1000)'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      eventType: emailEventType.describe('Type of email event'),
      recipientEmail: z
        .string()
        .optional()
        .describe('Email address of the affected recipient'),
      campaignName: z.string().optional().describe('Name of the campaign'),
      campaignId: z.string().optional().describe('ID of the campaign'),
      tagName: z.string().optional().describe('Tag name associated with the campaign'),
      timestamp: z.string().optional().describe('Timestamp when the event occurred'),
      clickedUrl: z.string().optional().describe('URL that was clicked (for click events)'),
      reason: z.string().optional().describe('Reason for failure, bounce, or spam report'),
      listId: z.string().optional().describe('List ID (for unsubscribe events)'),
      recipients: z
        .array(z.string())
        .optional()
        .describe('Batch of recipient emails (for send events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let eventTypes = ['send', 'open', 'click', 'fail', 'spam', 'unsubscribe', 'bounce'];

      let result = await client.createWebhook({
        name: `Slates Webhook`,
        url: ctx.input.webhookBaseUrl,
        events: eventTypes
      });

      let data = result?.data ?? result;

      return {
        registrationDetails: {
          webhookId: data?.id ?? data?.enc_id ?? data?.webhook_id ?? undefined
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhookId = (ctx.input.registrationDetails as Record<string, unknown>)?.webhookId as
        | string
        | undefined;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: Record<string, unknown>;

      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      let eventType = (data.event ?? data.event_type ?? data.type ?? '') as string;
      let normalizedType = eventType.toLowerCase();

      let validEvents = ['send', 'open', 'click', 'fail', 'spam', 'unsubscribe', 'bounce'];
      if (!validEvents.includes(normalizedType)) {
        return { inputs: [] };
      }

      let recipientEmail = (data.email ??
        data.recipient_email ??
        data.recipient ??
        '') as string;
      let campaignName = (data.campaign_name ?? data.campaign ?? '') as string;
      let campaignId = (data.campaign_id ?? data.enc_campaign_id ?? '') as string;
      let tagName = (data.tag_name ?? data.tag ?? '') as string;
      let timestamp = (data.ts_event ??
        data.date_event ??
        data.ts ??
        data.timestamp ??
        '') as string;
      let url = (data.url ?? data.clicked_url ?? '') as string;
      let reason = (data.reason ?? '') as string;
      let listId = (data.list_id ?? '') as string;

      let recipients: string[] | undefined;
      if (normalizedType === 'send' && Array.isArray(data.emails)) {
        recipients = data.emails as string[];
      } else if (normalizedType === 'send' && Array.isArray(data.recipients)) {
        recipients = data.recipients as string[];
      }

      return {
        inputs: [
          {
            eventType: normalizedType as z.infer<typeof emailEventType>,
            recipientEmail: recipientEmail || undefined,
            campaignName: campaignName || undefined,
            campaignId: campaignId || undefined,
            tagName: tagName || undefined,
            timestamp: String(timestamp) || undefined,
            url: url || undefined,
            reason: reason || undefined,
            listId: listId || undefined,
            recipients,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventId = `${ctx.input.eventType}-${ctx.input.campaignId || 'unknown'}-${ctx.input.recipientEmail || 'batch'}-${ctx.input.timestamp || Date.now()}`;

      return {
        type: `email.${ctx.input.eventType}`,
        id: eventId,
        output: {
          eventType: ctx.input.eventType,
          recipientEmail: ctx.input.recipientEmail,
          campaignName: ctx.input.campaignName,
          campaignId: ctx.input.campaignId,
          tagName: ctx.input.tagName,
          timestamp: ctx.input.timestamp,
          clickedUrl: ctx.input.url,
          reason: ctx.input.reason,
          listId: ctx.input.listId,
          recipients: ctx.input.recipients
        }
      };
    }
  })
  .build();
