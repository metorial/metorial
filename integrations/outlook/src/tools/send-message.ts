import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  emailAddress: z.object({
    name: z.string().optional().describe('Display name of the recipient'),
    address: z.string().describe('Email address of the recipient')
  })
});

let attachmentSchema = z.object({
  name: z.string().describe('File name including extension'),
  contentType: z
    .string()
    .optional()
    .describe('MIME type of the attachment (e.g., "application/pdf")'),
  contentBytes: z.string().describe('Base64-encoded file content')
});

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_message',
  description: `Send an email message from the authenticated user's mailbox. Supports recipients (to, cc, bcc), HTML or plain text body, importance level, reply-to addresses, and file attachments. The message is saved to Sent Items by default.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject line of the email'),
      bodyContent: z.string().describe('Body content of the email'),
      bodyContentType: z
        .enum(['text', 'html'])
        .default('html')
        .describe('Content type of the body'),
      toRecipients: z.array(recipientSchema).min(1).describe('Primary recipients'),
      ccRecipients: z.array(recipientSchema).optional().describe('CC recipients'),
      bccRecipients: z.array(recipientSchema).optional().describe('BCC recipients'),
      replyTo: z.array(recipientSchema).optional().describe('Reply-to addresses'),
      importance: z.enum(['low', 'normal', 'high']).optional().describe('Importance level'),
      attachments: z.array(attachmentSchema).optional().describe('File attachments'),
      saveToSentItems: z
        .boolean()
        .optional()
        .describe('Whether to save the message to Sent Items. Defaults to true.')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.sendMessage({
      subject: ctx.input.subject,
      body: {
        contentType: ctx.input.bodyContentType,
        content: ctx.input.bodyContent
      },
      toRecipients: ctx.input.toRecipients,
      ccRecipients: ctx.input.ccRecipients,
      bccRecipients: ctx.input.bccRecipients,
      replyTo: ctx.input.replyTo,
      importance: ctx.input.importance,
      attachments: ctx.input.attachments,
      saveToSentItems: ctx.input.saveToSentItems
    });

    let toAddresses = ctx.input.toRecipients.map(r => r.emailAddress.address).join(', ');

    return {
      output: { sent: true },
      message: `Email **"${ctx.input.subject}"** sent to ${toAddresses}.`
    };
  })
  .build();
