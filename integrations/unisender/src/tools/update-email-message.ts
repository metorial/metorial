import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let updateEmailMessage = SlateTool.create(spec, {
  name: 'Update Email Message',
  key: 'update_email_message',
  description: `Update an existing email message. Modify any of its properties including sender, subject, body, list association, and other settings.`
})
  .input(
    z.object({
      messageId: z.number().describe('ID of the email message to update'),
      senderName: z.string().optional().describe('Updated sender display name'),
      senderEmail: z.string().optional().describe('Updated sender email address'),
      subject: z.string().optional().describe('Updated email subject line'),
      body: z.string().optional().describe('Updated HTML body of the email'),
      listId: z.number().optional().describe('Updated contact list ID'),
      textBody: z.string().optional().describe('Updated plain text body'),
      generateText: z.boolean().optional().describe('Auto-generate text body from HTML'),
      tag: z.string().optional().describe('Updated tag'),
      messageLang: z.string().optional().describe('Updated language'),
      wrapType: z
        .enum(['skip', 'right', 'left', 'center'])
        .optional()
        .describe('Updated text wrapping mode')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    await client.updateEmailMessage({
      id: ctx.input.messageId,
      sender_name: ctx.input.senderName,
      sender_email: ctx.input.senderEmail,
      subject: ctx.input.subject,
      body: ctx.input.body,
      list_id: ctx.input.listId,
      text_body: ctx.input.textBody,
      generate_text: ctx.input.generateText ? 1 : undefined,
      tag: ctx.input.tag,
      lang: ctx.input.messageLang,
      wrap_type: ctx.input.wrapType
    });

    return {
      output: { success: true },
      message: `Updated email message \`${ctx.input.messageId}\``
    };
  })
  .build();
