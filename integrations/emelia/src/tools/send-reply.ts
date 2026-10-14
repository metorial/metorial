import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let sendReply = SlateTool.create(spec, {
  name: 'Send Reply',
  key: 'send_reply',
  description: `Send a reply to a contact's response through Emelia's merged inbox. Allows replying directly within the campaign context.`
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      contactId: z.string().describe('ID of the contact to reply to'),
      body: z.string().describe('Reply message body as HTML'),
      providerId: z
        .string()
        .optional()
        .describe(
          'Sender mailbox ID from manage_email_providers; use this or senderEmail for the documented reply API'
        ),
      senderEmail: z
        .string()
        .optional()
        .describe('Sender mailbox address, alternative to providerId'),
      messageId: z.string().optional().describe('Original Message-ID for threading the reply'),
      to: z
        .array(z.string())
        .optional()
        .describe(
          'Recipient addresses when composing a message without an original Message-ID'
        ),
      subject: z.string().optional().describe('Reply subject')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the reply was sent'),
      reply: z.record(z.string(), z.unknown()).optional().describe('Reply details')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.providerId && ctx.input.senderEmail)
      throw createApiServiceError('Use either providerId or senderEmail, not both.');
    if (
      (ctx.input.providerId || ctx.input.senderEmail) &&
      !ctx.input.messageId &&
      !ctx.input.to?.length
    )
      throw createApiServiceError(
        'Provide an original messageId or recipient addresses in to.'
      );
    let client = new EmeliaClient(ctx.auth.token);
    let result = await client.replyToEmeliaReply({
      campaignId: ctx.input.campaignId,
      contactId: ctx.input.contactId,
      body: ctx.input.body,
      providerId: ctx.input.providerId,
      senderEmail: ctx.input.senderEmail,
      messageId: ctx.input.messageId,
      to: ctx.input.to,
      subject: ctx.input.subject
    });
    return {
      output: { success: true, reply: result },
      message: `Sent reply to contact **${ctx.input.contactId}** in campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
