import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let listEmailLogs = SlateTool.create(spec, {
  name: 'List Email Logs',
  key: 'list_email_logs',
  description: `Search and retrieve individual email delivery logs. Each log entry includes message status, subject, sender/recipient, sending stream, category, open/click counts, and related events. Supports filtering by date range, recipient, sender, subject, status, stream, and category.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from previous response (nextPageCursor)'),
      sentAfter: z
        .string()
        .optional()
        .describe('Filter messages sent after this ISO 8601 date'),
      sentBefore: z
        .string()
        .optional()
        .describe('Filter messages sent before this ISO 8601 date'),
      to: z.string().optional().describe('Filter by recipient email'),
      from: z.string().optional().describe('Filter by sender email'),
      subject: z.string().optional().describe('Filter by email subject'),
      status: z.string().optional().describe('Filter by delivery status'),
      sendingStream: z
        .enum(['transactional', 'bulk'])
        .optional()
        .describe('Filter by sending stream'),
      category: z.string().optional().describe('Filter by email category'),
      sendingDomainId: z.number().optional().describe('Filter by sending domain ID')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique message ID'),
            status: z.string().optional().describe('Delivery status'),
            subject: z.string().optional().describe('Email subject'),
            from: z.string().optional().describe('Sender email'),
            to: z.string().optional().describe('Recipient email'),
            sentAt: z.string().optional().describe('When the email was sent'),
            category: z.string().optional().describe('Email category'),
            sendingStream: z
              .string()
              .optional()
              .describe('Sending stream (transactional or bulk)'),
            opensCount: z.number().optional().describe('Number of opens'),
            clicksCount: z.number().optional().describe('Number of clicks')
          })
        )
        .describe('Email log entries'),
      totalCount: z.number().optional().describe('Total number of matching messages'),
      nextPageCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listEmailLogs({
      searchAfter: ctx.input.cursor,
      sentAfter: ctx.input.sentAfter,
      sentBefore: ctx.input.sentBefore,
      to: ctx.input.to,
      from: ctx.input.from,
      subject: ctx.input.subject,
      status: ctx.input.status,
      sendingStream: ctx.input.sendingStream,
      category: ctx.input.category,
      sendingDomainId: ctx.input.sendingDomainId
    });

    let rawMessages = result.messages || result || [];
    let messages = (Array.isArray(rawMessages) ? rawMessages : []).map((m: any) => ({
      messageId: m.message_id || m.id?.toString() || '',
      status: m.status,
      subject: m.subject,
      from: m.from,
      to: m.to,
      sentAt: m.sent_at,
      category: m.category,
      sendingStream: m.sending_stream,
      opensCount: m.opens_count,
      clicksCount: m.clicks_count
    }));

    return {
      output: {
        messages,
        totalCount: result.total_count,
        nextPageCursor: result.next_page_cursor
      },
      message: `Retrieved **${messages.length}** email log entries${result.total_count ? ` out of ${result.total_count} total` : ''}.`
    };
  })
  .build();
