import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageEventTypes = [
  'message.received',
  'message.sent',
  'message.delivered',
  'message.bounced',
  'message.complained',
  'message.rejected'
] as const;

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggered when email message events occur: received, sent, delivered, bounced, complained, or rejected.'
})
  .input(
    z.object({
      eventType: z.enum(messageEventTypes).describe('Type of message event'),
      eventId: z.string().describe('Unique event identifier'),
      messageId: z.string().describe('ID of the affected message'),
      inboxId: z.string().describe('Inbox the message belongs to'),
      threadId: z.string().describe('Thread the message belongs to'),
      from: z.string().optional().describe('Sender address'),
      to: z.array(z.string()).optional().describe('Recipient addresses'),
      subject: z.string().optional().describe('Message subject'),
      text: z.string().optional().describe('Plain text body'),
      html: z.string().optional().describe('HTML body'),
      extractedText: z.string().optional().describe('Reply text without quoted history'),
      labels: z.array(z.string()).optional().describe('Message labels'),
      timestamp: z.string().optional().describe('Message timestamp'),
      threadSubject: z.string().optional().describe('Thread subject'),
      threadSenders: z.array(z.string()).optional().describe('Thread senders'),
      threadRecipients: z.array(z.string()).optional().describe('Thread recipients'),
      threadMessageCount: z.number().optional().describe('Number of messages in thread')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the affected message'),
      inboxId: z.string().describe('Inbox the message belongs to'),
      threadId: z.string().describe('Thread the message belongs to'),
      from: z.string().optional().describe('Sender address'),
      to: z.array(z.string()).optional().describe('Recipient addresses'),
      subject: z.string().optional().describe('Message subject'),
      text: z.string().optional().describe('Plain text body'),
      html: z.string().optional().describe('HTML body'),
      extractedText: z.string().optional().describe('Reply text without quoted history'),
      labels: z.array(z.string()).optional().describe('Message labels'),
      timestamp: z.string().optional().describe('Message timestamp'),
      threadSubject: z.string().optional().describe('Thread subject'),
      threadSenders: z.array(z.string()).optional().describe('Thread senders'),
      threadRecipients: z.array(z.string()).optional().describe('Thread recipients'),
      threadMessageCount: z.number().optional().describe('Number of messages in thread')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

      let webhook = await client.createWebhook(ctx.input.webhookBaseUrl, [
        ...messageEventTypes
      ]);

      return {
        registrationDetails: {
          webhookId: webhook.webhook_id,
          secret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        type: string;
        event_type: string;
        event_id: string;
        message?: {
          message_id: string;
          inbox_id: string;
          thread_id: string;
          from: string;
          to: string[];
          subject?: string;
          text?: string;
          html?: string;
          extracted_text?: string;
          labels: string[];
          timestamp: string;
        };
        thread?: {
          thread_id: string;
          subject?: string;
          senders: string[];
          recipients: string[];
          message_count: number;
        };
      };

      if (!body.event_type || !messageEventTypes.includes(body.event_type as any)) {
        return { inputs: [] };
      }

      let msg = body.message;
      let thread = body.thread;

      return {
        inputs: [
          {
            eventType: body.event_type as (typeof messageEventTypes)[number],
            eventId: body.event_id,
            messageId: msg?.message_id || '',
            inboxId: msg?.inbox_id || '',
            threadId: msg?.thread_id || '',
            from: msg?.from,
            to: msg?.to,
            subject: msg?.subject,
            text: msg?.text,
            html: msg?.html,
            extractedText: msg?.extracted_text,
            labels: msg?.labels,
            timestamp: msg?.timestamp,
            threadSubject: thread?.subject,
            threadSenders: thread?.senders,
            threadRecipients: thread?.recipients,
            threadMessageCount: thread?.message_count
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          messageId: ctx.input.messageId,
          inboxId: ctx.input.inboxId,
          threadId: ctx.input.threadId,
          from: ctx.input.from,
          to: ctx.input.to,
          subject: ctx.input.subject,
          text: ctx.input.text,
          html: ctx.input.html,
          extractedText: ctx.input.extractedText,
          labels: ctx.input.labels,
          timestamp: ctx.input.timestamp,
          threadSubject: ctx.input.threadSubject,
          threadSenders: ctx.input.threadSenders,
          threadRecipients: ctx.input.threadRecipients,
          threadMessageCount: ctx.input.threadMessageCount
        }
      };
    }
  })
  .build();
