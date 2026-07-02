import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { customerIoServiceError } from '../lib/errors';
import { spec } from '../spec';

let validateIdentifiers = (identifiers: Record<string, string> | undefined) => {
  if (!identifiers) {
    return;
  }

  let provided = ['id', 'email', 'cio_id'].filter(key => identifiers[key]);
  if (provided.length !== 1) {
    throw customerIoServiceError(
      'identifiers must contain exactly one of id, email, or cio_id.'
    );
  }
};

export let sendTransactionalMessage = SlateTool.create(spec, {
  name: 'Send Transactional Message',
  key: 'send_transactional_message',
  description: `Send a transactional message (email, push notification, SMS, in-app, or inbox message) to a person. Transactional messages are for receipts, password resets, order confirmations, and other messages your audience implicitly expects to receive.
You can reference a pre-built template by its transactional message ID, or provide the full message content inline.`,
  instructions: [
    'For email, provide the "to" address and either a transactionalMessageId (to use a template) or subject/body.',
    'For push, provide identifiers and transactionalMessageId.',
    'For SMS, provide the "to" phone number, identifiers, and transactionalMessageId.',
    'For in-app and inbox messages, provide identifiers and transactionalMessageId.',
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
        .enum(['email', 'push', 'sms', 'in_app', 'inbox_message'])
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
          'Person identifiers with exactly one of id, email, or cio_id (e.g. { "id": "user123" })'
        ),
      messageData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value data to populate Liquid merge fields in the template'),
      sendAt: z
        .number()
        .optional()
        .describe('Unix timestamp when Customer.io should send the message'),
      subject: z
        .string()
        .optional()
        .describe('Email subject (overrides template subject, email only)'),
      body: z.string().optional().describe('Email HTML body or channel body override'),
      from: z
        .string()
        .optional()
        .describe('Sender email address for email or verified phone number for SMS'),
      replyTo: z.string().optional().describe('Reply-to email address (email only)'),
      bcc: z.string().optional().describe('BCC email address (email only)'),
      title: z.string().optional().describe('Push notification title override (push only)'),
      message: z
        .string()
        .optional()
        .describe('Push notification message override (push only)'),
      imageUrl: z.string().optional().describe('Push notification image URL (push only)'),
      link: z.string().optional().describe('Deep link opened from a push notification'),
      language: z.string().optional().describe('Override the recipient language'),
      disableMessageRetention: z
        .boolean()
        .optional()
        .describe('If true, Customer.io will not retain the message body after sending'),
      sendToUnsubscribed: z
        .boolean()
        .optional()
        .describe('If true, sends even if the recipient has unsubscribed'),
      queueDraft: z
        .boolean()
        .optional()
        .describe('If true, queues the message as a draft instead of sending immediately'),
      autoCreate: z
        .boolean()
        .optional()
        .describe(
          'If true, Customer.io can create an empty transactional record for a string trigger name'
        )
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

    validateIdentifiers(ctx.input.identifiers);

    if (ctx.input.channel === 'email' && !ctx.input.to) {
      throw customerIoServiceError('to is required for transactional email messages.');
    }
    if (ctx.input.channel === 'sms' && !ctx.input.to) {
      throw customerIoServiceError('to is required for transactional SMS messages.');
    }
    if (
      ['push', 'sms', 'in_app', 'inbox_message'].includes(ctx.input.channel) &&
      !ctx.input.identifiers
    ) {
      throw customerIoServiceError(
        `identifiers is required for transactional ${ctx.input.channel} messages.`
      );
    }
    if (ctx.input.autoCreate && typeof ctx.input.transactionalMessageId !== 'string') {
      throw customerIoServiceError(
        'transactionalMessageId must be a string when autoCreate is true.'
      );
    }

    let message: Record<string, unknown> = {
      transactional_message_id: ctx.input.transactionalMessageId,
      message_data: ctx.input.messageData,
      identifiers: ctx.input.identifiers,
      send_at: ctx.input.sendAt,
      disable_message_retention: ctx.input.disableMessageRetention,
      send_to_unsubscribed: ctx.input.sendToUnsubscribed,
      queue_draft: ctx.input.queueDraft,
      auto_create: ctx.input.autoCreate,
      language: ctx.input.language
    };

    if (ctx.input.to) message.to = ctx.input.to;
    if (ctx.input.subject) message.subject = ctx.input.subject;
    if (ctx.input.body) message.body = ctx.input.body;
    if (ctx.input.from) message.from = ctx.input.from;
    if (ctx.input.replyTo) message.reply_to = ctx.input.replyTo;
    if (ctx.input.bcc) message.bcc = ctx.input.bcc;
    if (ctx.input.title) message.title = ctx.input.title;
    if (ctx.input.message) message.message = ctx.input.message;
    if (ctx.input.imageUrl) message.image_url = ctx.input.imageUrl;
    if (ctx.input.link) message.link = ctx.input.link;

    let result: any;
    if (ctx.input.channel === 'email') {
      result = await appClient.sendTransactionalEmail(message);
    } else if (ctx.input.channel === 'push') {
      result = await appClient.sendTransactionalPush(message);
    } else if (ctx.input.channel === 'sms') {
      result = await appClient.sendTransactionalSms(message);
    } else if (ctx.input.channel === 'in_app') {
      result = await appClient.sendTransactionalInApp(message);
    } else {
      result = await appClient.sendTransactionalInboxMessage(message);
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
