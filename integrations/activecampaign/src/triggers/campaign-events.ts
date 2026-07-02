import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignEventTypes = [
  'sent',
  'open',
  'click',
  'reply',
  'forward',
  'share',
  'bounce'
] as const;

export let campaignEvents = SlateTrigger.create(spec, {
  name: 'Campaign Events',
  key: 'campaign_events',
  description:
    'Triggers when a campaign is sent, opened, clicked, replied to, forwarded, shared, or bounced.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of campaign event'),
      payload: z.record(z.string(), z.any()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the contact'),
      contactEmail: z.string().optional().describe('Email of the contact'),
      campaignId: z.string().optional().describe('ID of the campaign'),
      campaignName: z.string().optional().describe('Name of the campaign'),
      listId: z.string().optional().describe('ID of the list the campaign was sent to'),
      linkUrl: z.string().optional().describe('URL of the clicked link (for click events)'),
      initiatedBy: z.string().optional().describe('Who initiated the action'),
      occurredAt: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiUrl: ctx.config.apiUrl
      });

      let result = await client.createWebhook({
        name: 'Slates Campaign Events',
        url: ctx.input.webhookBaseUrl,
        events: [...campaignEventTypes],
        sources: ['public', 'admin', 'api', 'system']
      });

      return {
        registrationDetails: {
          webhookId: result.webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiUrl: ctx.config.apiUrl
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any;
      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = await ctx.request.json();
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let eventType = data.type || data.type || 'unknown';

      return {
        inputs: [
          {
            eventType,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload as Record<string, any>;

      let contactId = String(p['contact[id]'] || p.contactId || '');
      let contactEmail = String(p['contact[email]'] || p.email || '');
      let campaignId = String(p['campaign[id]'] || p.campaignId || '');
      let campaignName = String(p['campaign[name]'] || p.campaignName || '');
      let listId = String(p.list || p['list[id]'] || p.listId || '');
      let linkUrl = String(p['link[url]'] || p.linkUrl || '');
      let initiatedBy = String(p.initiated_by || p.source || '');
      let occurredAt = String(p.date_time || p.dateTime || '');

      let uniqueId = `${ctx.input.eventType}-${contactId || contactEmail}-${campaignId}-${occurredAt || Date.now()}`;

      return {
        type: `campaign.${ctx.input.eventType}`,
        id: uniqueId,
        output: {
          contactId: contactId || undefined,
          contactEmail: contactEmail || undefined,
          campaignId: campaignId || undefined,
          campaignName: campaignName || undefined,
          listId: listId || undefined,
          linkUrl: linkUrl || undefined,
          initiatedBy: initiatedBy || undefined,
          occurredAt: occurredAt || undefined
        }
      };
    }
  })
  .build();
