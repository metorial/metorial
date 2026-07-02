import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { stringOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send an outbound message from an admin to a contact. Supports in-app and email messages.
The message will initiate a new conversation with the target contact.`,
  instructions: [
    'The fromAdminId must be a valid admin in the workspace.',
    'Identify the recipient by contactId, email, or userId — at least one is required.',
    'For email messages, subject is required.',
    'template can be "plain" (no Intercom branding) or "personal" (default, branded).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageType: z.enum(['inapp', 'email']).describe('Type of message to send'),
      fromAdminId: z.string().describe('Admin ID sending the message'),
      subject: z.string().optional().describe('Email subject (required for email messages)'),
      body: z.string().describe('Message body (HTML supported)'),
      template: z.enum(['plain', 'personal']).optional().describe('Email template style'),
      toContactId: z.string().optional().describe('Recipient contact ID'),
      toEmail: z.string().optional().describe('Recipient email address'),
      toUserId: z.string().optional().describe('Recipient external user ID'),
      createContactOnMissing: z
        .boolean()
        .optional()
        .describe('Create a new contact if no match found')
    })
  )
  .output(
    z.object({
      messageId: z.string().optional().describe('Message ID'),
      messageType: z.string().optional().describe('Message type'),
      body: z.string().optional().describe('Message body'),
      subject: z.string().optional().describe('Subject (for email)'),
      ownerId: z.string().optional().describe('Owner admin ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (!ctx.input.toContactId && !ctx.input.toEmail && !ctx.input.toUserId) {
      throw intercomServiceError(
        'At least one of toContactId, toEmail, or toUserId is required'
      );
    }

    let result = await client.sendMessage({
      messageType: ctx.input.messageType === 'inapp' ? 'in_app' : ctx.input.messageType,
      subject: ctx.input.subject,
      body: ctx.input.body,
      template: ctx.input.template,
      from: { type: 'admin', id: ctx.input.fromAdminId },
      to: {
        type: 'user',
        id: ctx.input.toContactId,
        email: ctx.input.toEmail,
        userId: ctx.input.toUserId
      },
      createContactOnMissing: ctx.input.createContactOnMissing
    });

    return {
      output: {
        messageId: stringOrUndefined(result.id),
        messageType: stringOrUndefined(result.message_type),
        body: stringOrUndefined(result.body),
        subject: stringOrUndefined(result.subject),
        ownerId: result.owner?.id ? String(result.owner.id) : undefined
      },
      message: `Sent ${ctx.input.messageType} message to **${ctx.input.toEmail || ctx.input.toContactId || ctx.input.toUserId}**`
    };
  })
  .build();
