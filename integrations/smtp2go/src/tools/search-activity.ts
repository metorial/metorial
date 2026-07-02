import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchActivity = SlateTool.create(spec, {
  name: 'Search Email Activity',
  key: 'search_activity',
  description: `Search the email activity stream for events such as bounces, opens, clicks, deliveries, spam reports, and unsubscribes. Filter by sender, recipient, subject, date range, and event type. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('Start date in ISO-8601 format'),
      endDate: z.string().optional().describe('End date in ISO-8601 format'),
      search: z.string().optional().describe('General search term'),
      searchSubject: z.string().optional().describe('Filter by email subject'),
      searchSender: z.string().optional().describe('Filter by sender address'),
      searchRecipient: z.string().optional().describe('Filter by recipient address'),
      searchUsernames: z.string().optional().describe('Filter by SMTP username or API key'),
      limit: z.number().optional().describe('Maximum number of events to return'),
      continueToken: z.string().optional().describe('Continuation token for pagination'),
      onlyLatest: z.boolean().optional().describe('Only return the latest event per email'),
      eventTypes: z
        .array(
          z.enum([
            'soft-bounced',
            'hard-bounced',
            'rejected',
            'spam',
            'delivered',
            'unsubscribed',
            'resubscribed',
            'opened',
            'clicked',
            'processed'
          ])
        )
        .optional()
        .describe('Filter by specific event types')
    })
  )
  .output(
    z.object({
      totalEvents: z.number().describe('Total number of matching events'),
      continueToken: z.string().optional().describe('Token for fetching next page'),
      events: z
        .array(
          z.object({
            emailId: z.string().describe('Email identifier'),
            event: z.string().describe('Event type'),
            date: z.string().describe('Event timestamp'),
            from: z.string().describe('Sender address'),
            subject: z.string().describe('Email subject'),
            recipients: z.array(z.string()).optional().describe('Recipient addresses'),
            smtpResponse: z.string().optional().describe('SMTP server response'),
            reason: z.string().optional().describe('Reason for bounce/rejection')
          })
        )
        .describe('Activity events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.searchActivity(ctx.input);
    let data = result.data || result;

    let events = (data.events || []).map((e: any) => ({
      emailId: e.email_id ?? '',
      event: e.event ?? '',
      date: e.date ?? '',
      from: e.from ?? '',
      subject: e.subject ?? '',
      recipients: e.recipients,
      smtpResponse: e.smtp_response,
      reason: e.reason
    }));

    return {
      output: {
        totalEvents: data.total_events ?? events.length,
        continueToken: data.continue_token,
        events
      },
      message: `Found **${data.total_events ?? events.length}** activity event(s).`
    };
  })
  .build();
