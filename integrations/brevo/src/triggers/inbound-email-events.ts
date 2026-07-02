import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let inboundEmailEvents = SlateTrigger.create(spec, {
  name: 'Inbound Email Events',
  key: 'inbound_email_events',
  description:
    'Receive notifications when inbound emails are processed by Brevo. Triggered when an inbound email is received and parsed.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (inboundEmailProcessed)'),
      uuid: z.string().optional().describe('Unique event ID'),
      sender: z.string().optional().describe('Sender email address'),
      subject: z.string().optional().describe('Email subject'),
      recipient: z.string().optional().describe('Recipient email address'),
      date: z.string().optional().describe('Event timestamp'),
      ts: z.number().optional().describe('Event timestamp (Unix)'),
      raw: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      sender: z.string().optional().describe('Sender email address'),
      recipient: z.string().optional().describe('Recipient email address'),
      subject: z.string().optional().describe('Email subject line'),
      eventTimestamp: z.string().optional().describe('When the email was processed (ISO 8601)')
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
        events: ['inboundEmailProcessed'],
        type: 'inbound',
        description: 'Slates inbound email event webhook'
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
      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((evt: any) => ({
          event: evt.event ?? 'inboundEmailProcessed',
          uuid: evt.uuid ?? evt['message-id'] ?? evt.messageId,
          sender: evt.sender ?? evt.from,
          subject: evt.subject,
          recipient: evt.recipient ?? evt.to,
          date: evt.date,
          ts: evt.ts,
          raw: evt
        }))
      };
    },

    handleEvent: async ctx => {
      let eventTimestamp: string | undefined;
      if (ctx.input.ts) {
        eventTimestamp = new Date(ctx.input.ts * 1000).toISOString();
      } else if (ctx.input.date) {
        eventTimestamp = ctx.input.date;
      }

      let eventId =
        ctx.input.uuid ??
        `inbound-${ctx.input.sender ?? 'unknown'}-${ctx.input.ts ?? Date.now()}`;

      return {
        type: 'inbound_email.processed',
        id: eventId,
        output: {
          sender: ctx.input.sender,
          recipient: ctx.input.recipient,
          subject: ctx.input.subject,
          eventTimestamp
        }
      };
    }
  });
