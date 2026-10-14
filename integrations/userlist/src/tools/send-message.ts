import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type MessagePayload } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Transactional Message',
  key: 'send_message',
  description: `Sends a one-off transactional message to a user via email or in-app (web) channel. You can use a predefined template or compose a custom message with subject, body, and sender configuration.
When using a template, pass the template identifier along with any custom properties for Liquid personalization.`,
  instructions: [
    'Provide either a `templateIdentifier` to use a predefined template, or `subject` and `body` for a custom message.',
    'Identify the recipient by `userIdentifier` (required for web channel) or `recipientEmail` (for email channel).',
    'For multipart bodies, provide html and/or text. For text/html or text/plain, provide content.',
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
      companyIdentifier: z
        .string()
        .optional()
        .describe('Identifier of the company associated with the message.'),
      senderIdentifier: z.string().optional().describe('UUID of the sender configuration.'),
      senderEmail: z.string().optional().describe('From email address for an email message.'),
      topicIdentifier: z.string().optional().describe('UUID of the subscription topic.'),
      themeIdentifier: z
        .string()
        .optional()
        .describe('UUID of the theme configuration. Omit when disableTheme is true.'),
      disableTheme: z
        .boolean()
        .optional()
        .describe('Set to true to disable theming. Cannot be used with themeIdentifier.'),
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
    if (!ctx.input.userIdentifier && !ctx.input.recipientEmail) {
      throw createApiServiceError(
        'Provide userIdentifier or recipientEmail for the recipient.'
      );
    }
    if (
      ctx.input.channel === 'web' &&
      (!ctx.input.userIdentifier || ctx.input.recipientEmail !== undefined)
    ) {
      throw createApiServiceError(
        'Web messages require userIdentifier and cannot include recipientEmail.'
      );
    }
    if (!ctx.input.templateIdentifier && (!ctx.input.subject || !ctx.input.body)) {
      throw createApiServiceError('Provide templateIdentifier or both subject and body.');
    }
    if (ctx.input.disableTheme && ctx.input.themeIdentifier !== undefined) {
      throw createApiServiceError('Omit themeIdentifier when disableTheme is true.');
    }

    let body: MessagePayload['body'];
    if (ctx.input.body) {
      let inputBody = ctx.input.body;
      if (inputBody.type === 'multipart') {
        let content: Array<{ type: 'html' | 'text'; content: string }> = [];
        if (inputBody.html !== undefined)
          content.push({ type: 'html', content: inputBody.html });
        if (inputBody.text !== undefined)
          content.push({ type: 'text', content: inputBody.text });
        if (content.length === 0) {
          throw createApiServiceError('Multipart bodies require html and/or text content.');
        }
        body = { type: 'multipart', content };
      } else {
        if (inputBody.content === undefined) {
          throw createApiServiceError('Text and HTML bodies require content.');
        }
        body = {
          type: inputBody.type === 'text/html' ? 'html' : 'text',
          content: inputBody.content
        };
      }
    }

    let client = new Client({ token: ctx.auth.token });
    let payload: MessagePayload = {
      template: ctx.input.templateIdentifier,
      user: ctx.input.userIdentifier,
      to: ctx.input.recipientEmail,
      company: ctx.input.companyIdentifier,
      channel: ctx.input.channel ?? (ctx.input.templateIdentifier ? undefined : 'email'),
      subject: ctx.input.subject,
      body,
      sender: ctx.input.senderIdentifier,
      from: ctx.input.senderEmail,
      topic: ctx.input.topicIdentifier,
      theme: ctx.input.disableTheme ? false : ctx.input.themeIdentifier,
      reply_to: ctx.input.replyTo,
      preheader: ctx.input.preheader,
      properties: ctx.input.properties
    };

    await client.sendMessage(payload);

    let recipientRef = ctx.input.userIdentifier || ctx.input.recipientEmail || 'unknown';
    let channelRef =
      ctx.input.channel || (ctx.input.templateIdentifier ? 'template channel' : 'email');
    return {
      output: { success: true },
      message: `Transactional message accepted for delivery to **${recipientRef}** via **${channelRef}** channel.`
    };
  })
  .build();
