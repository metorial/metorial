import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addMessage = SlateTool.create(spec, {
  name: 'Add Message to Conversation',
  key: 'add_message',
  description: `Add a reply or internal note to an existing conversation. Set visibility to control whether the message is a public reply (visible to the customer) or an internal note (staff-only).`,
  instructions: [
    'Use visibility 0 for a regular reply visible to the customer, and 1 for an internal note visible only to staff.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      conversationSlug: z
        .string()
        .describe('The slug of the conversation to add the message to'),
      messageBody: z.string().describe('The message content (supports markdown)'),
      visibility: z
        .enum(['reply', 'note'])
        .optional()
        .default('reply')
        .describe('"reply" for customer-visible message, "note" for internal staff-only note'),
      senderEmail: z
        .string()
        .optional()
        .describe(
          'Email of the sender (staff or customer). If omitted, defaults to the authenticated user.'
        ),
      senderName: z.string().optional().describe('Name of the sender'),
      recipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses or phone numbers for message recipients'),
      attachmentUrl: z.string().optional().describe('URL of a file to attach'),
      suppressNotifications: z
        .boolean()
        .optional()
        .describe('Prevent email/integration notifications'),
      suppressAutoresolve: z
        .boolean()
        .optional()
        .describe('Prevent auto-resolution when staff responds')
    })
  )
  .output(
    z.object({
      messageBody: z.string().describe('The message body that was posted'),
      visibility: z.number().describe('0=Reply, 1=Internal Note'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });

    let visibilityCode = ctx.input.visibility === 'note' ? 1 : 0;

    let result = await client.createMessage(ctx.input.conversationSlug, {
      body: ctx.input.messageBody,
      visibility: visibilityCode,
      user: ctx.input.senderEmail
        ? { email: ctx.input.senderEmail, name: ctx.input.senderName }
        : undefined,
      recipients: ctx.input.recipients,
      attachment: ctx.input.attachmentUrl,
      suppressNotifications: ctx.input.suppressNotifications,
      suppressAutoresolve: ctx.input.suppressAutoresolve
    });

    let m = result.message || result;

    return {
      output: {
        messageBody: m.body || ctx.input.messageBody,
        visibility: m.visibility ?? visibilityCode,
        createdAt: m.created_at
      },
      message: `Added ${ctx.input.visibility === 'note' ? 'internal note' : 'reply'} to conversation **${ctx.input.conversationSlug}**.`
    };
  })
  .build();
