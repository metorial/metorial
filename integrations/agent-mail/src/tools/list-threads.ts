import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listThreads = SlateTool.create(spec, {
  name: 'List Threads',
  key: 'list_threads',
  description: `List email conversation threads in an inbox. Threads group related messages together. Supports filtering by labels, date range, and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox to list threads from'),
      limit: z.number().optional().describe('Maximum threads per page'),
      pageToken: z.string().optional().describe('Pagination cursor from a previous response'),
      ascending: z.boolean().optional().describe('Sort oldest first when true'),
      labels: z.array(z.string()).optional().describe('Filter threads by labels'),
      before: z
        .string()
        .optional()
        .describe('Only return threads before this ISO 8601 timestamp'),
      after: z
        .string()
        .optional()
        .describe('Only return threads after this ISO 8601 timestamp'),
      includeSpam: z.boolean().optional().describe('Include spam threads'),
      includeBlocked: z.boolean().optional().describe('Include blocked threads'),
      includeTrash: z.boolean().optional().describe('Include trashed threads')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of threads in this page'),
      nextPageToken: z.string().optional().describe('Cursor for the next page'),
      threads: z
        .array(
          z.object({
            threadId: z.string().describe('Unique thread identifier'),
            inboxId: z.string().describe('Inbox the thread belongs to'),
            labels: z.array(z.string()).describe('Thread labels'),
            timestamp: z.string().describe('Last activity timestamp'),
            senders: z.array(z.string()).describe('All sender addresses in the thread'),
            recipients: z.array(z.string()).describe('All recipient addresses in the thread'),
            subject: z.string().optional().describe('Thread subject'),
            preview: z.string().optional().describe('Text preview'),
            messageCount: z.number().describe('Total messages in the thread')
          })
        )
        .describe('Array of threads')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.listThreads(ctx.input.inboxId, {
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

    let threads = result.threads.map(t => ({
      threadId: t.thread_id,
      inboxId: t.inbox_id,
      labels: t.labels,
      timestamp: t.timestamp,
      senders: t.senders,
      recipients: t.recipients,
      subject: t.subject,
      preview: t.preview,
      messageCount: t.message_count
    }));

    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        threads
      },
      message: `Found **${result.count}** thread(s) in inbox ${ctx.input.inboxId}.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
