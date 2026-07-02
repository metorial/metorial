import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let emailEvent = SlateTrigger.create(spec, {
  name: 'Email Event',
  key: 'email_event',
  description:
    'Receive real-time webhook notifications for email delivery events including delivery, open, click, unsubscribe, spam complaint, bounce, soft bounce, suspension, and reject. Configure the webhook URL in Mailtrap dashboard under Settings → Webhooks.',
  instructions: [
    'Create a webhook in your Mailtrap dashboard (Settings → Webhooks) and point it to the provided webhook URL.',
    'Select the sending stream (Transactional or Bulk) and event types you want to receive.',
    'Mailtrap delivers events in batches (up to 500 events per request) every 30 seconds.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('Type of email event'),
      eventId: z.string().describe('Unique event ID'),
      messageId: z.string().describe('Message ID of the related email'),
      email: z.string().describe('Recipient email address'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      sendingStream: z.string().optional().describe('Sending stream (transactional or bulk)'),
      sendingDomainName: z.string().optional().describe('Sending domain name'),
      category: z.string().optional().describe('Email category'),
      customVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom variables attached to the email'),
      response: z.string().optional().describe('Server response (for bounce events)'),
      responseCode: z.number().optional().describe('Response code (for bounce events)'),
      bounceCategory: z.string().optional().describe('Bounce category (for bounce events)'),
      url: z.string().optional().describe('Clicked URL (for click events)'),
      ip: z.string().optional().describe('IP address (for open/click events)'),
      userAgent: z.string().optional().describe('User agent (for open/click events)'),
      reason: z.string().optional().describe('Reason (for suspension/reject events)')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID of the affected email'),
      email: z.string().describe('Recipient email address'),
      timestamp: z.number().describe('Unix timestamp of the event'),
      sendingStream: z.string().optional().describe('Sending stream (transactional or bulk)'),
      sendingDomainName: z.string().optional().describe('Sending domain name'),
      category: z.string().optional().describe('Email category'),
      customVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom variables from the email'),
      response: z.string().optional().describe('Server response (bounce events)'),
      responseCode: z.number().optional().describe('Response code (bounce events)'),
      bounceCategory: z.string().optional().describe('Bounce category'),
      url: z.string().optional().describe('Clicked URL'),
      ip: z.string().optional().describe('IP address'),
      userAgent: z.string().optional().describe('User agent string'),
      reason: z.string().optional().describe('Reason for suspension/rejection')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.input.request.headers.get('content-type') || '';
      let body = await ctx.input.request.text();

      let events: any[] = [];

      if (contentType.includes('application/json')) {
        let parsed = JSON.parse(body);
        if (parsed.events && Array.isArray(parsed.events)) {
          events = parsed.events;
        } else if (Array.isArray(parsed)) {
          events = parsed;
        } else {
          events = [parsed];
        }
      } else {
        // JSON Lines format: one JSON object per line
        let lines = body.split('\n').filter((line: string) => line.trim());
        events = lines.map((line: string) => JSON.parse(line));
      }

      let inputs = events.map((event: any) => ({
        eventType: event.event || 'unknown',
        eventId: event.event_id || `${event.message_id}-${event.event}-${event.timestamp}`,
        messageId: event.message_id || '',
        email: event.email || '',
        timestamp: event.timestamp || 0,
        sendingStream: event.sending_stream,
        sendingDomainName: event.sending_domain_name,
        category: event.category,
        customVariables: event.custom_variables,
        response: event.response,
        responseCode: event.response_code,
        bounceCategory: event.bounce_category,
        url: event.url,
        ip: event.ip,
        userAgent: event.user_agent,
        reason: event.reason
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `email.${input.eventType}`,
        id: input.eventId,
        output: {
          messageId: input.messageId,
          email: input.email,
          timestamp: input.timestamp,
          sendingStream: input.sendingStream,
          sendingDomainName: input.sendingDomainName,
          category: input.category,
          customVariables: input.customVariables,
          response: input.response,
          responseCode: input.responseCode,
          bounceCategory: input.bounceCategory,
          url: input.url,
          ip: input.ip,
          userAgent: input.userAgent,
          reason: input.reason
        }
      };
    }
  })
  .build();
