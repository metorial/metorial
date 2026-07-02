import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

let eventOutputSchema = z.object({
  eventId: z.string().describe('Unique event ID'),
  eventType: z
    .string()
    .describe('Event type (accepted, delivered, failed, opened, clicked, etc.)'),
  timestamp: z.number().describe('Unix timestamp of the event'),
  recipient: z.string().optional().describe('Recipient email address'),
  sender: z.string().optional().describe('Sender email address'),
  subject: z.string().optional().describe('Email subject'),
  messageId: z.string().optional().describe('Mailgun message ID'),
  severity: z
    .string()
    .optional()
    .describe('Severity for failed events (permanent or temporary)'),
  reason: z.string().optional().describe('Failure or rejection reason'),
  deliveryStatusCode: z.number().optional().describe('SMTP delivery status code'),
  deliveryStatusMessage: z.string().optional().describe('SMTP delivery status message'),
  tags: z.array(z.string()).optional().describe('Tags attached to the message'),
  logLevel: z.string().optional().describe('Log level (info, warn, error)')
});

export let getEvents = SlateTool.create(spec, {
  name: 'Get Events',
  key: 'get_events',
  description: `Query Mailgun's legacy Events API for a domain. Returns delivery, open, click, bounce, complaint, and other email events.
Filter by event type, recipient, sender, subject, date range, and more. Prefer the Query Logs tool for current delivery/debug logging unless you specifically need the legacy Events API.`,
  instructions: [
    'Dates should be in RFC 2822 format (e.g. "Thu, 13 Oct 2011 18:02:00 GMT").',
    'Use eventType to filter by specific events like "delivered", "failed", "opened", "clicked".',
    'For failed events, use severity to filter between "permanent" (hard bounce) and "temporary" (soft bounce).'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to query events for'),
      eventType: z
        .enum([
          'accepted',
          'rejected',
          'delivered',
          'failed',
          'opened',
          'clicked',
          'unsubscribed',
          'complained',
          'stored'
        ])
        .optional()
        .describe('Filter by event type'),
      begin: z.string().optional().describe('Start date in RFC 2822 format'),
      end: z.string().optional().describe('End date in RFC 2822 format'),
      recipient: z.string().optional().describe('Filter by recipient email address'),
      from: z.string().optional().describe('Filter by sender email address'),
      subject: z.string().optional().describe('Filter by email subject'),
      messageId: z.string().optional().describe('Filter by Mailgun message ID'),
      severity: z
        .enum(['permanent', 'temporary'])
        .optional()
        .describe('Filter failed events by severity'),
      limit: z.number().optional().describe('Number of events to return (default 300)'),
      ascending: z.boolean().optional().describe('Sort in ascending order by timestamp')
    })
  )
  .output(
    z.object({
      events: z.array(eventOutputSchema),
      hasMore: z.boolean().describe('Whether more events are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.getEvents(ctx.input.domain, {
      event: ctx.input.eventType,
      begin: ctx.input.begin,
      end: ctx.input.end,
      recipient: ctx.input.recipient,
      from: ctx.input.from,
      subject: ctx.input.subject,
      messageId: ctx.input.messageId,
      severity: ctx.input.severity,
      limit: ctx.input.limit,
      ascending: ctx.input.ascending ? 'yes' : undefined
    });

    let events = (result.items || []).map(item => ({
      eventId: item.id,
      eventType: item.event,
      timestamp: item.timestamp,
      recipient: item.recipient,
      sender: item.message?.headers?.from,
      subject: item.message?.headers?.subject,
      messageId: item.message?.headers?.['message-id'],
      severity: item.severity,
      reason: item.reason,
      deliveryStatusCode: item['delivery-status']?.code,
      deliveryStatusMessage: item['delivery-status']?.message,
      tags: item.tags,
      logLevel: item['log-level']
    }));

    return {
      output: {
        events,
        hasMore: (result.items || []).length > 0 && !!result.paging?.next
      },
      message: `Retrieved **${events.length}** event(s) for domain **${ctx.input.domain}**.`
    };
  })
  .build();
