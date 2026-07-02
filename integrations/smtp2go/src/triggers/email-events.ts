import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailEventsTrigger = SlateTrigger.create(spec, {
  name: 'Email Events',
  key: 'email_events',
  description:
    'Triggers when email events occur, such as delivery, open, click, bounce, spam report, unsubscribe, or rejection. Receives real-time webhook notifications from SMTP2GO.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of email event'),
      eventId: z.string().describe('Unique event identifier'),
      emailId: z.string().describe('Email identifier'),
      sender: z.string().describe('Sender email address'),
      recipient: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject line'),
      timestamp: z.string().describe('Event timestamp'),
      rawEvent: z.any().describe('Full event payload from SMTP2GO')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('Email identifier'),
      sender: z.string().describe('Sender email address'),
      recipient: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject line'),
      timestamp: z.string().describe('When the event occurred'),
      bounceType: z
        .string()
        .optional()
        .describe('Hard or soft bounce classification (for bounce events)'),
      clickedUrl: z.string().optional().describe('URL that was clicked (for click events)'),
      userAgent: z.string().optional().describe('Recipient device/email client information'),
      smtpResponse: z.string().optional().describe('SMTP server response message'),
      reason: z.string().optional().describe('Reason for bounce, rejection, or spam report')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let result = await client.addWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [
          'processed',
          'delivered',
          'open',
          'click',
          'bounce',
          'spam',
          'unsubscribe',
          'resubscribe',
          'reject'
        ],
        outputType: 'json'
      });

      let data = result.data || result;

      return {
        registrationDetails: {
          webhookId: data.webhook_id || data.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      await client.removeWebhook({
        webhookId: ctx.input.registrationDetails.webhookId
      });
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // SMTP2GO may send a single event or an array of events
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        eventType: event.event || event.type || 'unknown',
        eventId:
          event.event_id ||
          event.id ||
          `${event.email_id || ''}-${event.event || ''}-${event.date || Date.now()}`,
        emailId: event.email_id || '',
        sender: event.sender || event.from || '',
        recipient: event.recipient || event.to || '',
        subject: event.subject || '',
        timestamp: event.date || event.timestamp || '',
        rawEvent: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.rawEvent || {};

      return {
        type: `email.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          emailId: ctx.input.emailId,
          sender: ctx.input.sender,
          recipient: ctx.input.recipient,
          subject: ctx.input.subject,
          timestamp: ctx.input.timestamp,
          bounceType: raw.bounce_type || raw.classification,
          clickedUrl: raw.url || raw.clicked_url,
          userAgent: raw.user_agent || raw.email_client,
          smtpResponse: raw.smtp_response,
          reason: raw.reason || raw.error
        }
      };
    }
  })
  .build();
