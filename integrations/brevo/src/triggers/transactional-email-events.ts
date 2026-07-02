import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transactionalEmailEventTypes = [
  'sent',
  'request',
  'delivered',
  'opened',
  'uniqueOpened',
  'clicked',
  'softBounce',
  'hardBounce',
  'spam',
  'deferred',
  'blocked',
  'invalid',
  'error',
  'unsubscribed',
  'proxyOpen',
  'uniqueProxyOpen'
] as const;

export let transactionalEmailEvents = SlateTrigger.create(spec, {
  name: 'Transactional Email Events',
  key: 'transactional_email_events',
  description:
    'Receive real-time notifications for transactional email lifecycle events including delivery, opens, clicks, bounces, spam complaints, and unsubscribes.'
})
  .input(
    z.object({
      event: z.string().describe('Event type'),
      messageId: z.string().optional().describe('Message ID'),
      email: z.string().optional().describe('Recipient email'),
      subject: z.string().optional().describe('Email subject'),
      tag: z.string().optional().describe('Email tag'),
      templateId: z.number().optional().describe('Template ID'),
      date: z.string().optional().describe('Event timestamp'),
      ts: z.number().optional().describe('Event timestamp (Unix)'),
      tsEvent: z.number().optional().describe('Event timestamp (Unix)'),
      reason: z.string().optional().describe('Reason for bounce/block/error'),
      link: z.string().optional().describe('Clicked link URL'),
      senderEmail: z.string().optional().describe('Sender email'),
      tags: z.array(z.string()).optional().describe('Message tags'),
      raw: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Brevo message ID for tracking'),
      email: z.string().optional().describe('Recipient email address'),
      subject: z.string().optional().describe('Email subject line'),
      tag: z.string().optional().describe('Primary tag assigned to the email'),
      tags: z.array(z.string()).optional().describe('All tags assigned to the email'),
      templateId: z.number().optional().describe('Template ID used'),
      senderEmail: z.string().optional().describe('Sender email address'),
      eventTimestamp: z.string().optional().describe('When the event occurred (ISO 8601)'),
      reason: z.string().optional().describe('Reason for bounce, block, or error'),
      link: z.string().optional().describe('URL that was clicked (for click events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...transactionalEmailEventTypes],
        type: 'transactional',
        description: 'Slates transactional email event webhook'
      });

      return {
        registrationDetails: { webhookId: result.webhookId }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = await ctx.request.json();

      // Brevo may send batched events as an array
      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((evt: any) => ({
          event: evt.event,
          messageId: evt['message-id'] ?? evt.messageId,
          email: evt.email,
          subject: evt.subject,
          tag: evt.tag,
          templateId: evt.template_id ?? evt.templateId,
          date: evt.date,
          ts: evt.ts,
          tsEvent: evt.ts_event ?? evt.tsEvent,
          reason: evt.reason,
          link: evt.link,
          senderEmail: evt.sender_email ?? evt.senderEmail,
          tags: evt.tags,
          raw: evt
        }))
      };
    },

    handleEvent: async ctx => {
      let eventType = (ctx.input.event ?? 'unknown').toLowerCase();
      let eventTimestamp: string | undefined;
      if (ctx.input.tsEvent) {
        eventTimestamp = new Date(ctx.input.tsEvent * 1000).toISOString();
      } else if (ctx.input.ts) {
        eventTimestamp = new Date(ctx.input.ts * 1000).toISOString();
      } else if (ctx.input.date) {
        eventTimestamp = ctx.input.date;
      }

      let eventId = `${ctx.input.messageId ?? 'unknown'}-${eventType}-${ctx.input.tsEvent ?? ctx.input.ts ?? Date.now()}`;

      return {
        type: `transactional_email.${eventType}`,
        id: eventId,
        output: {
          messageId: ctx.input.messageId,
          email: ctx.input.email,
          subject: ctx.input.subject,
          tag: ctx.input.tag,
          tags: ctx.input.tags,
          templateId: ctx.input.templateId,
          senderEmail: ctx.input.senderEmail,
          eventTimestamp,
          reason: ctx.input.reason,
          link: ctx.input.link
        }
      };
    }
  });
