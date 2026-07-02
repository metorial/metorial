import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailActivityTrigger = SlateTrigger.create(spec, {
  name: 'Email Activity',
  key: 'email_activity',
  description:
    '[Polling fallback] Polls for new email activity events including deliveries, bounces, opens, clicks, spam complaints, and unsubscribes. Use this as an alternative to webhooks for monitoring email events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of activity event'),
      eventId: z.string().describe('Unique event identifier'),
      emailId: z.string().describe('Email identifier'),
      sender: z.string().describe('Sender email address'),
      subject: z.string().describe('Email subject'),
      date: z.string().describe('Event date'),
      recipients: z.array(z.string()).describe('Recipient addresses'),
      rawEvent: z.any().describe('Full event data')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('Email identifier'),
      sender: z.string().describe('Sender email address'),
      subject: z.string().describe('Email subject'),
      date: z.string().describe('When the event occurred'),
      recipients: z.array(z.string()).describe('Recipient addresses'),
      smtpResponse: z.string().optional().describe('SMTP server response'),
      reason: z.string().optional().describe('Reason for bounce/rejection'),
      username: z.string().optional().describe('SMTP user or API key that sent the email')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let lastPollDate =
        ctx.state?.lastPollDate || new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let result = await client.searchActivity({
        startDate: lastPollDate,
        limit: 100
      });

      let data = result.data || result;
      let events: any[] = data.events || [];

      let inputs = events.map((event: any) => ({
        eventType: event.event || 'unknown',
        eventId:
          event.event_id || `${event.email_id || ''}-${event.event || ''}-${event.date || ''}`,
        emailId: event.email_id || '',
        sender: event.from || event.sender || '',
        subject: event.subject || '',
        date: event.date || '',
        recipients: event.recipients || [],
        rawEvent: event
      }));

      let newLastPollDate = events.length > 0 ? events[0]!.date || lastPollDate : lastPollDate;

      return {
        inputs,
        updatedState: {
          lastPollDate: newLastPollDate
        }
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.rawEvent || {};

      return {
        type: `email.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          emailId: ctx.input.emailId,
          sender: ctx.input.sender,
          subject: ctx.input.subject,
          date: ctx.input.date,
          recipients: ctx.input.recipients,
          smtpResponse: raw.smtp_response,
          reason: raw.reason || raw.error,
          username: raw.username
        }
      };
    }
  })
  .build();
