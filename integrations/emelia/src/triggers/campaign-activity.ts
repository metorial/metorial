import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let campaignActivity = SlateTrigger.create(spec, {
  name: 'Campaign Activity',
  key: 'campaign_activity',
  description:
    'Triggers when campaign activity occurs, such as email opens, clicks, or replies. Requires a campaign ID to watch.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event (open, click, reply)'),
      campaignId: z.string().describe('Campaign ID'),
      webhookId: z.string().describe('Webhook ID'),
      contactEmail: z.string().optional().describe('Email of the contact'),
      contactId: z.string().optional().describe('Contact ID'),
      timestamp: z.string().optional().describe('When the event occurred'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw event payload')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign ID where the event occurred'),
      contactEmail: z.string().optional().describe('Email of the contact'),
      contactId: z.string().optional().describe('Contact ID'),
      eventType: z.string().describe('Type of event (open, click, reply)'),
      timestamp: z.string().optional().describe('When the event occurred'),
      details: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional event details')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new EmeliaClient(ctx.auth.token);

      // Register webhooks for all event types (open, click, reply)
      let events = ['open', 'click', 'reply'];
      let webhookIds: string[] = [];

      for (let event of events) {
        try {
          let webhook = await client.createWebhook({
            campaignId: '', // Will be set per-campaign
            url: ctx.input.webhookBaseUrl,
            event
          });
          if (webhook?._id || webhook?.id) {
            webhookIds.push(webhook._id || webhook.id);
          }
        } catch {
          // Some events may not be supported, continue
        }
      }

      return {
        registrationDetails: {
          webhookIds,
          webhookUrl: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new EmeliaClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookIds?: string[] };

      if (details?.webhookIds) {
        for (let webhookId of details.webhookIds) {
          try {
            await client.deleteWebhook(webhookId);
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.event || data.type || data.eventType || 'unknown') as string;
      let campaignId = (data.campaignId || data.campaign_id || '') as string;
      let contactEmail = (data.email || data.contactEmail || data.contact_email) as
        | string
        | undefined;
      let contactId = (data.contactId || data.contact_id) as string | undefined;
      let timestamp = (data.timestamp ||
        data.date ||
        data.createdAt ||
        new Date().toISOString()) as string;

      return {
        inputs: [
          {
            eventType,
            campaignId,
            webhookId: (data.webhookId || data.webhook_id || '') as string,
            contactEmail,
            contactId,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, campaignId, contactEmail, contactId, timestamp, rawPayload } =
        ctx.input;

      return {
        type: `campaign.${eventType}`,
        id: `${campaignId}-${eventType}-${contactId || contactEmail || ''}-${timestamp || Date.now()}`,
        output: {
          campaignId,
          contactEmail,
          contactId,
          eventType,
          timestamp,
          details: rawPayload
        }
      };
    }
  })
  .build();
