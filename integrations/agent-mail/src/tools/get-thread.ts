import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getThread = SlateTool.create(spec, {
  name: 'Get Thread',
  key: 'get_thread',
  description: `Retrieve a full email thread including all messages ordered by timestamp. Provides the complete conversation history with sender/recipient details, message content, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox containing the thread'),
      threadId: z.string().describe('Unique identifier of the thread')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Unique thread identifier'),
      inboxId: z.string().describe('Inbox the thread belongs to'),
      labels: z.array(z.string()).describe('Thread labels'),
      timestamp: z.string().describe('Last activity timestamp'),
      senders: z.array(z.string()).describe('All sender addresses'),
      recipients: z.array(z.string()).describe('All recipient addresses'),
      subject: z.string().optional().describe('Thread subject'),
      messageCount: z.number().describe('Total messages in the thread'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique message identifier'),
            timestamp: z.string().describe('Message timestamp'),
            from: z.string().describe('Sender address'),
            to: z.array(z.string()).describe('Recipient addresses'),
            cc: z.array(z.string()).optional().describe('CC recipients'),
            subject: z.string().optional().describe('Subject line'),
            text: z.string().optional().describe('Plain text body'),
            html: z.string().optional().describe('HTML body'),
            extractedText: z.string().optional().describe('Reply text without quoted history'),
            labels: z.array(z.string()).describe('Message labels')
          })
        )
        .describe('Messages in the thread, ordered by timestamp ascending')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
    let t = await client.getThread(ctx.input.inboxId, ctx.input.threadId);

    return {
      output: {
        threadId: t.thread_id,
        inboxId: t.inbox_id,
        labels: t.labels,
        timestamp: t.timestamp,
        senders: t.senders,
        recipients: t.recipients,
        subject: t.subject,
        messageCount: t.message_count,
        messages: (t.messages || []).map(m => ({
          messageId: m.message_id,
          timestamp: m.timestamp,
          from: m.from,
          to: m.to,
          cc: m.cc,
          subject: m.subject,
          text: m.text,
          html: m.html,
          extractedText: m.extracted_text,
          labels: m.labels
        }))
      },
      message: `Retrieved thread "${t.subject || t.thread_id}" with **${t.message_count}** message(s).`
    };
  })
  .build();
