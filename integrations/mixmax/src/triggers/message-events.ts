import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailRecipientSchema = z.object({
  email: z.string().optional().describe('Recipient email'),
  name: z.string().optional().describe('Recipient name')
});

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when an email is sent or a reply is received. Captures message metadata including sender, recipients, subject, and body.'
})
  .input(
    z.object({
      eventName: z.string().describe('Event type (message:sent or message:received)'),
      eventId: z.string().describe('Unique event identifier'),
      payload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Message ID'),
      threadId: z.string().optional().describe('Thread ID'),
      fromEmail: z.string().optional().describe('Sender email address'),
      fromName: z.string().optional().describe('Sender name'),
      subject: z.string().optional().describe('Email subject'),
      body: z.string().optional().describe('Email body (plain text)'),
      to: z.array(emailRecipientSchema).optional().describe('To recipients'),
      cc: z.array(emailRecipientSchema).optional().describe('CC recipients'),
      bcc: z.array(emailRecipientSchema).optional().describe('BCC recipients'),
      sentAt: z.string().optional().describe('When the message was sent'),
      userId: z.string().optional().describe('Mixmax user ID of the sender')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let sentRule = await client.createRule({
        name: 'Slates: Message Sent Webhook',
        trigger: { event: 'message:sent' },
        actions: [
          {
            type: 'webhook',
            url: `${ctx.input.webhookBaseUrl}/sent`
          }
        ],
        enabled: true
      });

      let receivedRule = await client.createRule({
        name: 'Slates: Message Received Webhook',
        trigger: { event: 'message:received' },
        actions: [
          {
            type: 'webhook',
            url: `${ctx.input.webhookBaseUrl}/received`
          }
        ],
        enabled: true
      });

      return {
        registrationDetails: {
          sentRuleId: sentRule._id,
          receivedRuleId: receivedRule._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        sentRuleId: string;
        receivedRuleId: string;
      };

      if (details.sentRuleId) {
        await client.deleteRule(details.sentRuleId).catch(() => {});
      }
      if (details.receivedRuleId) {
        await client.deleteRule(details.receivedRuleId).catch(() => {});
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as any;

      let eventName = data.eventName || 'message:sent';
      let eventId = data.id || data.messageId || data.rfc822Id || `${eventName}-${Date.now()}`;

      return {
        inputs: [
          {
            eventName,
            eventId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: ctx.input.eventName === 'message:received' ? 'message.received' : 'message.sent',
        id: ctx.input.eventId,
        output: {
          messageId: p.id || p.messageId,
          threadId: p.threadId,
          fromEmail: p.from?.email || p.fromEmail,
          fromName: p.from?.name || p.fromName,
          subject: p.subject,
          body: p.plaintextBody || p.body,
          to: p.to,
          cc: p.cc,
          bcc: p.bcc,
          sentAt: p.sent || p.timestamp,
          userId: p.userId
        }
      };
    }
  })
  .build();
