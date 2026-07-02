import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let engagementEvents = SlateTrigger.create(spec, {
  name: 'Engagement Events',
  key: 'engagement_events',
  description:
    'Triggers when a recipient opens an email, clicks a link, or downloads a file. Captures engagement details including recipient info and interaction data.'
})
  .input(
    z.object({
      eventName: z.string().describe('Event type (opened, clicked, or downloaded)'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Related message ID'),
      recipientEmail: z.string().optional().describe('Email of the recipient who engaged'),
      recipientName: z.string().optional().describe('Name of the recipient'),
      subject: z.string().optional().describe('Email subject'),
      linkUrl: z.string().optional().describe('Clicked link URL (for click events)'),
      linkText: z.string().optional().describe('Clicked link text (for click events)'),
      fileName: z.string().optional().describe('Downloaded file name (for download events)'),
      userAgent: z.string().optional().describe('Recipient browser/client user agent'),
      ipAddress: z.string().optional().describe('Recipient IP address'),
      timestamp: z.string().optional().describe('When the engagement occurred'),
      userId: z.string().optional().describe('Mixmax user ID of the email sender')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let openedRule = await client.createRule({
        name: 'Slates: Email Opened Webhook',
        trigger: { event: 'opened' },
        actions: [
          {
            type: 'webhook',
            url: `${ctx.input.webhookBaseUrl}/opened`
          }
        ],
        enabled: true
      });

      let clickedRule = await client.createRule({
        name: 'Slates: Link Clicked Webhook',
        trigger: { event: 'clicked' },
        actions: [
          {
            type: 'webhook',
            url: `${ctx.input.webhookBaseUrl}/clicked`
          }
        ],
        enabled: true
      });

      let downloadedRule = await client.createRule({
        name: 'Slates: File Downloaded Webhook',
        trigger: { event: 'downloaded' },
        actions: [
          {
            type: 'webhook',
            url: `${ctx.input.webhookBaseUrl}/downloaded`
          }
        ],
        enabled: true
      });

      return {
        registrationDetails: {
          openedRuleId: openedRule._id,
          clickedRuleId: clickedRule._id,
          downloadedRuleId: downloadedRule._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        openedRuleId: string;
        clickedRuleId: string;
        downloadedRuleId: string;
      };

      if (details.openedRuleId) {
        await client.deleteRule(details.openedRuleId).catch(() => {});
      }
      if (details.clickedRuleId) {
        await client.deleteRule(details.clickedRuleId).catch(() => {});
      }
      if (details.downloadedRuleId) {
        await client.deleteRule(details.downloadedRuleId).catch(() => {});
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      let eventName = data.eventName || 'opened';
      let eventId =
        data.id ||
        `${eventName}-${data.messageId}-${data.recipientEmail}-${data.timestamp || Date.now()}`;

      return {
        inputs: [
          {
            eventName,
            eventId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      let typeMap: Record<string, string> = {
        opened: 'email.opened',
        clicked: 'email.clicked',
        downloaded: 'email.downloaded'
      };

      return {
        type: typeMap[ctx.input.eventName] || `email.${ctx.input.eventName}`,
        id: ctx.input.eventId,
        output: {
          messageId: p.messageId,
          recipientEmail: p.recipientEmail,
          recipientName: p.recipientName,
          subject: p.message?.subject || p.subject,
          linkUrl: p.linkUrl,
          linkText: p.linkText,
          fileName: p.fileName,
          userAgent: p.userAgent,
          ipAddress: p.ipAddress,
          timestamp: p.timestamp,
          userId: p.userId
        }
      };
    }
  })
  .build();
