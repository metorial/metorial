import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let sendTransactionalMessage = SlateTool.create(spec, {
  name: 'Send Transactional Message',
  key: 'send_transactional_message',
  description: `Send a transactional message (email, push notification, or SMS) to a person. Transactional messages are for receipts, password resets, order confirmations, and other messages your audience implicitly expects to receive.
You can reference a pre-built template by its transactional message ID, or provide the full message content inline.`,
  instructions: [
    'For email, provide the "to" address and either a transactionalMessageId (to use a template) or subject/body.',
    'For push, provide the person identifier and transactionalMessageId.',
    'For SMS, provide the "to" phone number and transactionalMessageId.',
    'Message data (key-value pairs) can be passed to populate Liquid template variables.'
  ],
  constraints: [
    'Rate limit: 100 requests per second.',
    'Maximum 15 total recipients across To and BCC fields for email.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channel: z
        .enum(['email', 'push', 'sms'])
        .describe('The channel to send the transactional message through'),
      transactionalMessageId: z
        .union([z.string(), z.number()])
        .describe(
          'The ID or trigger name of the transactional message template in Customer.io'
        ),
      to: z
        .string()
        .optional()
        .describe('Recipient address — email address for email, phone number for SMS'),
      identifiers: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Person identifiers (e.g. { "id": "user123" } or { "email": "test@example.com" })'
        ),
      messageData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value data to populate Liquid merge fields in the template'),
      subject: z
        .string()
        .optional()
        .describe('Email subject (overrides template subject, email only)'),
      body: z
        .string()
        .optional()
        .describe('Email HTML body (overrides template body, email only)'),
      from: z
        .string()
        .optional()
        .describe('Sender email address (overrides template sender, email only)'),
      replyTo: z.string().optional().describe('Reply-to email address (email only)'),
      bcc: z.string().optional().describe('BCC email address (email only)'),
      disableMessageRetention: z
        .boolean()
        .optional()
        .describe('If true, Customer.io will not retain the message body after sending'),
      sendToUnsubscribed: z
        .boolean()
        .optional()
        .describe('If true, sends even if the recipient has unsubscribed')
    })
  )
  .output(
    z.object({
      deliveryId: z
        .string()
        .optional()
        .describe('The unique delivery ID for the sent message'),
      queuedAt: z.number().optional().describe('Unix timestamp when the message was queued')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let message: Record<string, unknown> = {
      transactional_message_id: ctx.input.transactionalMessageId,
      message_data: ctx.input.messageData,
      identifiers: ctx.input.identifiers,
      disable_message_retention: ctx.input.disableMessageRetention,
      send_to_unsubscribed: ctx.input.sendToUnsubscribed
    };

    if (ctx.input.to) message.to = ctx.input.to;
    if (ctx.input.subject) message.subject = ctx.input.subject;
    if (ctx.input.body) message.body = ctx.input.body;
    if (ctx.input.from) message.from = ctx.input.from;
    if (ctx.input.replyTo) message.reply_to = ctx.input.replyTo;
    if (ctx.input.bcc) message.bcc = ctx.input.bcc;

    let result: any;
    if (ctx.input.channel === 'email') {
      result = await appClient.sendTransactionalEmail(message);
    } else if (ctx.input.channel === 'push') {
      result = await appClient.sendTransactionalPush(message);
    } else {
      result = await appClient.sendTransactionalSms(message);
    }

    return {
      output: {
        deliveryId: result?.delivery_id,
        queuedAt: result?.queued_at
      },
      message: `Sent transactional **${ctx.input.channel}** message${ctx.input.to ? ` to **${ctx.input.to}**` : ''}.`
    };
  })
  .build();
