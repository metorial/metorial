import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `List email messages in an inbox with filtering by labels, date range, and inclusion of spam/blocked/trash. Supports pagination. Returns messages sorted by timestamp (newest first by default).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox to list messages from'),
      limit: z.number().optional().describe('Maximum number of messages to return per page'),
      pageToken: z.string().optional().describe('Pagination cursor from a previous response'),
      ascending: z.boolean().optional().describe('Sort oldest first when true'),
      labels: z.array(z.string()).optional().describe('Filter messages by labels'),
      before: z
        .string()
        .optional()
        .describe('Only return messages before this ISO 8601 timestamp'),
      after: z
        .string()
        .optional()
        .describe('Only return messages after this ISO 8601 timestamp'),
      includeSpam: z.boolean().optional().describe('Include spam messages'),
      includeBlocked: z.boolean().optional().describe('Include blocked messages'),
      includeTrash: z.boolean().optional().describe('Include trashed messages')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of messages in this page'),
      nextPageToken: z.string().optional().describe('Cursor for fetching the next page'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique message identifier'),
            inboxId: z.string().describe('Inbox the message belongs to'),
            threadId: z.string().describe('Thread the message belongs to'),
            labels: z.array(z.string()).describe('Message labels'),
            timestamp: z.string().describe('Message timestamp'),
            from: z.string().describe('Sender address'),
            to: z.array(z.string()).describe('Recipient addresses'),
            subject: z.string().optional().describe('Subject line'),
            preview: z.string().optional().describe('Text preview'),
            size: z.number().describe('Message size in bytes')
          })
        )
        .describe('Array of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.listMessages(ctx.input.inboxId, {
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken,
      ascending: ctx.input.ascending,
      labels: ctx.input.labels,
      before: ctx.input.before,
      after: ctx.input.after,
      includeSpam: ctx.input.includeSpam,
      includeBlocked: ctx.input.includeBlocked,
      includeTrash: ctx.input.includeTrash
    });

    let messages = result.messages.map(m => ({
      messageId: m.message_id,
      inboxId: m.inbox_id,
      threadId: m.thread_id,
      labels: m.labels,
      timestamp: m.timestamp,
      from: m.from,
      to: m.to,
      subject: m.subject,
      preview: m.preview,
      size: m.size
    }));

    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        messages
      },
      message: `Found **${result.count}** message(s) in inbox ${ctx.input.inboxId}.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
