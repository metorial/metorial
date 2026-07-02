import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Transactional Message',
  key: 'send_message',
  description: `Sends a one-off transactional message to a user via email or in-app (web) channel. You can use a predefined template or compose a custom message with subject, body, and sender configuration.
When using a template, pass the template identifier along with any custom properties for Liquid personalization.`,
  instructions: [
    'Provide either a `templateIdentifier` to use a predefined template, or `subject` and `body` for a custom message.',
    'Identify the recipient by `userIdentifier` (required for web channel) or `recipientEmail` (for email channel).',
    'Custom properties can be passed to personalize templates via Liquid syntax.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateIdentifier: z
        .string()
        .optional()
        .describe('UUID of the predefined message template to use.'),
      userIdentifier: z
        .string()
        .optional()
        .describe('Identifier of the recipient user. Required for web channel messages.'),
      recipientEmail: z
        .string()
        .optional()
        .describe(
          'Email address of the recipient. Required for email if user is not provided.'
        ),
      channel: z
        .enum(['email', 'web'])
        .optional()
        .describe('Delivery channel. Defaults to "email".'),
      subject: z.string().optional().describe('Subject line for custom messages.'),
      body: z
        .object({
          type: z
            .enum(['text/html', 'text/plain', 'multipart'])
            .describe('Content type of the message body.'),
          content: z
            .string()
            .optional()
            .describe('Message content for text/html or text/plain types.'),
          html: z.string().optional().describe('HTML content for multipart type.'),
          text: z.string().optional().describe('Plain text content for multipart type.')
        })
        .optional()
        .describe('Message body for custom messages.'),
      senderIdentifier: z.string().optional().describe('UUID of the sender configuration.'),
      topicIdentifier: z.string().optional().describe('UUID of the subscription topic.'),
      themeIdentifier: z
        .string()
        .optional()
        .describe('UUID or boolean for theme configuration.'),
      replyTo: z.string().optional().describe('Reply-to email address.'),
      preheader: z.string().optional().describe('Preheader text for the email.'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom properties for Liquid template personalization.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was accepted for delivery.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let payload: Record<string, unknown> = {};
    if (ctx.input.templateIdentifier) payload.template = ctx.input.templateIdentifier;
    if (ctx.input.userIdentifier) payload.user = ctx.input.userIdentifier;
    if (ctx.input.recipientEmail) payload.to = ctx.input.recipientEmail;
    if (ctx.input.channel) payload.channel = ctx.input.channel;
    if (ctx.input.subject) payload.subject = ctx.input.subject;
    if (ctx.input.body) payload.body = ctx.input.body;
    if (ctx.input.senderIdentifier) payload.sender = ctx.input.senderIdentifier;
    if (ctx.input.topicIdentifier) payload.topic = ctx.input.topicIdentifier;
    if (ctx.input.themeIdentifier) payload.theme = ctx.input.themeIdentifier;
    if (ctx.input.replyTo) payload.reply_to = ctx.input.replyTo;
    if (ctx.input.preheader) payload.preheader = ctx.input.preheader;
    if (ctx.input.properties) payload.properties = ctx.input.properties;

    await client.sendMessage(payload as any);

    let recipientRef = ctx.input.userIdentifier || ctx.input.recipientEmail || 'unknown';
    let channelRef = ctx.input.channel || 'email';
    return {
      output: { success: true },
      message: `Transactional message sent to **${recipientRef}** via **${channelRef}** channel.`
    };
  })
  .build();
