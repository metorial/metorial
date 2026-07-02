import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReceivedEmail = SlateTool.create(spec, {
  name: 'Get Received Email',
  key: 'get_received_email',
  description: `Fetch the full content of a specific received email, including subject, plain text and HTML body, sender information, headers, and attachment URLs. Use "Browse Received Emails" first to obtain the email ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      receivedEmailId: z.string().describe('ID of the received email to fetch')
    })
  )
  .output(
    z.object({
      receivedEmailId: z.string().describe('Unique ID of the received email'),
      recipientEmail: z.string().describe('The proxy email address that received the message'),
      senderEmail: z.string().describe('The sender email address'),
      subject: z.string().describe('Email subject line'),
      bodyHtml: z.string().nullable().describe('HTML body of the email'),
      bodyPlain: z.string().nullable().describe('Plain text body of the email'),
      from: z
        .string()
        .nullable()
        .describe('Full From header value (may include display name)'),
      to: z.string().nullable().describe('Full To header value'),
      attachments: z
        .array(
          z.object({
            url: z.string().describe('URL to download the attachment')
          })
        )
        .describe('List of email attachments'),
      isProcessed: z.boolean().describe('Whether the email has been processed'),
      createdAt: z.string().describe('Timestamp when the email was received')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let email = await client.getReceivedEmail(ctx.input.receivedEmailId);

    return {
      output: email,
      message: `Retrieved email from **${email.senderEmail}** with subject "${email.subject}". ${email.attachments.length} attachment(s).`
    };
  })
  .build();
