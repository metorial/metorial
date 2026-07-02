import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description: `Search and retrieve outbound or inbound messages processed by your Postmark server. Filter by recipient, sender, subject, tag, status, date range, and metadata. Useful for auditing, debugging delivery issues, or finding specific messages.`,
  instructions: [
    'Set **direction** to "outbound" for sent messages or "inbound" for received messages.',
    'Use **count** and **offset** for pagination (max 500 per request).'
  ],
  constraints: [
    'Maximum of 500 messages per request and 10,000 total accessible messages.',
    'Messages are retained for your configured retention period (default 45 days).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      direction: z
        .enum(['outbound', 'inbound'])
        .default('outbound')
        .describe('Search outbound (sent) or inbound (received) messages.'),
      count: z
        .number()
        .min(1)
        .max(500)
        .default(50)
        .describe('Number of messages to return (max 500).'),
      offset: z.number().min(0).default(0).describe('Offset for pagination.'),
      recipient: z.string().optional().describe('Filter by recipient email address.'),
      fromEmail: z.string().optional().describe('Filter by sender email address.'),
      tag: z.string().optional().describe('Filter by tag.'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status (e.g., "sent", "queued" for outbound; "processed", "blocked" for inbound).'
        ),
      fromDate: z.string().optional().describe('Start date for filtering (YYYY-MM-DD).'),
      toDate: z.string().optional().describe('End date for filtering (YYYY-MM-DD).'),
      subject: z.string().optional().describe('Filter by subject line.'),
      messageStream: z.string().optional().describe('Filter by message stream ID.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching messages.'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique message ID.'),
            from: z.string().describe('Sender address.'),
            subject: z.string().describe('Email subject.'),
            status: z.string().describe('Message status.'),
            receivedAt: z
              .string()
              .describe('Timestamp when the message was received by Postmark.'),
            recipients: z.array(z.string()).describe('List of recipient addresses.'),
            tag: z.string().optional().describe('Associated tag.'),
            messageStream: z.string().optional().describe('Message stream ID.')
          })
        )
        .describe('List of matching messages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    if (ctx.input.direction === 'outbound') {
      let result = await client.searchOutboundMessages({
        count: ctx.input.count,
        offset: ctx.input.offset,
        recipient: ctx.input.recipient,
        fromemail: ctx.input.fromEmail,
        tag: ctx.input.tag,
        status: ctx.input.status,
        fromdate: ctx.input.fromDate,
        todate: ctx.input.toDate,
        subject: ctx.input.subject,
        messageStream: ctx.input.messageStream
      });

      return {
        output: {
          totalCount: result.TotalCount,
          messages: result.Messages.map(m => ({
            messageId: m.MessageID,
            from: m.From,
            subject: m.Subject,
            status: m.Status,
            receivedAt: m.ReceivedAt,
            recipients: m.Recipients,
            tag: m.Tag || undefined,
            messageStream: m.MessageStream || undefined
          }))
        },
        message: `Found **${result.TotalCount}** outbound messages (showing ${result.Messages.length}).`
      };
    } else {
      let result = await client.searchInboundMessages({
        count: ctx.input.count,
        offset: ctx.input.offset,
        recipient: ctx.input.recipient,
        fromemail: ctx.input.fromEmail,
        tag: ctx.input.tag,
        status: ctx.input.status,
        fromdate: ctx.input.fromDate,
        todate: ctx.input.toDate,
        subject: ctx.input.subject
      });

      return {
        output: {
          totalCount: result.TotalCount,
          messages: (result.InboundMessages || []).map((m: any) => ({
            messageId: m.MessageID,
            from: m.From,
            subject: m.Subject,
            status: m.Status,
            receivedAt: m.ReceivedAt || m.Date,
            recipients: m.Recipients || [],
            tag: m.Tag || undefined,
            messageStream: undefined
          }))
        },
        message: `Found **${result.TotalCount}** inbound messages (showing ${(result.InboundMessages || []).length}).`
      };
    }
  });
