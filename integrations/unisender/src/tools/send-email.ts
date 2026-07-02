import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Individual Email',
  key: 'send_email',
  description: `Send an individual email to a specific recipient. Unlike campaign-based sending, this sends directly to one email address. Useful for transactional-style messages or one-off communications.
The recipient must already be in the specified list.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Recipient email address'),
      senderName: z.string().describe('Sender display name'),
      senderEmail: z.string().describe('Sender email address (must be verified)'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('HTML body of the email'),
      listId: z.number().describe('ID of the list the recipient belongs to'),
      trackRead: z.boolean().optional().describe('Enable open tracking'),
      trackLinks: z.boolean().optional().describe('Enable link click tracking'),
      cc: z.string().optional().describe('CC email address'),
      wrapType: z
        .enum(['skip', 'right', 'left', 'center'])
        .optional()
        .describe('Text wrapping mode'),
      messageLang: z.string().optional().describe('Language code (e.g., "en", "ru")')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Send result details from Unisender')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let result = await client.sendEmail({
      email: ctx.input.email,
      sender_name: ctx.input.senderName,
      sender_email: ctx.input.senderEmail,
      subject: ctx.input.subject,
      body: ctx.input.body,
      list_id: ctx.input.listId,
      track_read: ctx.input.trackRead ? 1 : 0,
      track_links: ctx.input.trackLinks ? 1 : 0,
      cc: ctx.input.cc,
      wrap_type: ctx.input.wrapType,
      lang: ctx.input.messageLang
    });

    return {
      output: { result },
      message: `Sent email to **${ctx.input.email}** with subject **"${ctx.input.subject}"**`
    };
  })
  .build();
