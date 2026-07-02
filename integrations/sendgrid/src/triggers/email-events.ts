import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailEvents = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Receives delivery and engagement events from SendGrid via the Event Webhook, including delivered, bounced, opened, clicked, spam reports, unsubscribes, and more.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (e.g. delivered, bounce, open, click)'),
      email: z.string().describe('Recipient email address'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      sgEventId: z.string().describe('Unique SendGrid event ID'),
      sgMessageId: z.string().optional().describe('SendGrid message ID'),
      category: z.array(z.string()).optional().describe('Email categories'),
      reason: z.string().optional().describe('Reason for bounce, drop, or block'),
      status: z.string().optional().describe('SMTP status code'),
      url: z.string().optional().describe('Clicked URL (for click events)'),
      useragent: z.string().optional().describe('User agent (for open/click events)'),
      ip: z.string().optional().describe('IP address of the recipient'),
      asmGroupId: z
        .number()
        .optional()
        .describe('Suppression group ID (for unsubscribe events)'),
      raw: z.any().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Recipient email address'),
      eventType: z.string().describe('Event type (e.g. delivered, bounce, open, click)'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      messageId: z.string().optional().describe('SendGrid message ID'),
      category: z.array(z.string()).optional().describe('Email categories'),
      reason: z.string().optional().describe('Reason for suppression events'),
      status: z.string().optional().describe('SMTP status code'),
      url: z.string().optional().describe('Clicked URL (click events only)'),
      useragent: z.string().optional().describe('User agent string (open/click events)'),
      ip: z.string().optional().describe('Recipient IP address'),
      suppressionGroupId: z
        .number()
        .optional()
        .describe('Suppression group ID (unsubscribe events)'),
      subject: z.string().optional().describe('Email subject')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      await client.updateEventWebhookSettings({
        enabled: true,
        url: ctx.input.webhookBaseUrl,
        delivered: true,
        bounce: true,
        deferred: true,
        open: true,
        click: true,
        dropped: true,
        processed: true,
        spamReport: true,
        unsubscribe: true,
        groupUnsubscribe: true,
        groupResubscribe: true
      });

      return {
        registrationDetails: {
          url: ctx.input.webhookBaseUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      await client.updateEventWebhookSettings({
        enabled: false,
        url: ''
      });
    },

    handleRequest: async ctx => {
      let events = (await ctx.request.json()) as any[];

      // SendGrid sends arrays of event objects
      if (!Array.isArray(events)) {
        events = [events];
      }

      return {
        inputs: events.map((e: any) => ({
          event: e.event,
          email: e.email,
          timestamp: e.timestamp,
          sgEventId: e.sg_event_id,
          sgMessageId: e.sg_message_id,
          category: Array.isArray(e.category)
            ? e.category
            : e.category
              ? [e.category]
              : undefined,
          reason: e.reason,
          status: e.status,
          url: e.url,
          useragent: e.useragent,
          ip: e.ip,
          asmGroupId: e.asm_group_id,
          raw: e
        }))
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event || 'unknown';

      // Map SendGrid event names to consistent type format
      let typeMap: Record<string, string> = {
        processed: 'email.processed',
        dropped: 'email.dropped',
        delivered: 'email.delivered',
        deferred: 'email.deferred',
        bounce: 'email.bounced',
        open: 'email.opened',
        click: 'email.clicked',
        spamreport: 'email.spam_reported',
        unsubscribe: 'email.unsubscribed',
        group_unsubscribe: 'email.group_unsubscribed',
        group_resubscribe: 'email.group_resubscribed'
      };

      let type = typeMap[eventType] || `email.${eventType}`;

      let timestamp = ctx.input.timestamp
        ? new Date(ctx.input.timestamp * 1000).toISOString()
        : new Date().toISOString();

      return {
        type,
        id: ctx.input.sgEventId,
        output: {
          email: ctx.input.email,
          eventType,
          timestamp,
          messageId: ctx.input.sgMessageId,
          category: ctx.input.category,
          reason: ctx.input.reason,
          status: ctx.input.status,
          url: ctx.input.url,
          useragent: ctx.input.useragent,
          ip: ctx.input.ip,
          suppressionGroupId: ctx.input.asmGroupId,
          subject: ctx.input.raw?.subject
        }
      };
    }
  });
