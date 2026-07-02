import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { brevoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let sendTransactionalSms = SlateTool.create(spec, {
  name: 'Send Transactional SMS',
  key: 'send_transactional_sms',
  description: `Send a transactional SMS message to a mobile number. Supports inline content or templates, unicode, and marketing type classification.
Use for automated SMS communications like verification codes, order updates, or appointment reminders.`,
  instructions: [
    'Provide either content or templateId.',
    'The recipient number must include the country code (e.g., +91xxxxxxxxxx).',
    'Sender name is limited to 11 alphanumeric or 15 numeric characters.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sender: z
        .string()
        .describe('Sender name (max 11 alphanumeric or 15 numeric characters)'),
      recipient: z
        .string()
        .describe('Recipient mobile number with country code (e.g., +91xxxxxxxxxx)'),
      content: z
        .string()
        .optional()
        .describe('SMS message content (over 160 chars sends as multiple SMS)'),
      templateId: z
        .number()
        .optional()
        .describe('Template ID to use instead of inline content'),
      type: z
        .enum(['transactional', 'marketing'])
        .optional()
        .describe('SMS type classification'),
      tag: z.string().optional().describe('Tag for tracking'),
      unicodeEnabled: z.boolean().optional().describe('Enable unicode content'),
      organisationPrefix: z
        .string()
        .optional()
        .describe('Brand name prefix added before message content')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('Unique message ID for tracking')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.content && ctx.input.templateId === undefined) {
      throw brevoServiceError('Provide either content or templateId.');
    }

    if (ctx.input.content && ctx.input.templateId !== undefined) {
      throw brevoServiceError('Provide either content or templateId, not both.');
    }

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.sendTransactionalSms({
      sender: ctx.input.sender,
      recipient: ctx.input.recipient,
      content: ctx.input.content,
      templateId: ctx.input.templateId,
      type: ctx.input.type,
      tag: ctx.input.tag,
      unicodeEnabled: ctx.input.unicodeEnabled,
      organisationPrefix: ctx.input.organisationPrefix
    });

    return {
      output: { messageId: result.messageId },
      message: `Transactional SMS sent to **${ctx.input.recipient}**. Message ID: \`${result.messageId}\``
    };
  });
