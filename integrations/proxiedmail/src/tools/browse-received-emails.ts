import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let receivedEmailLinkSchema = z.object({
  receivedEmailId: z.string().describe('Unique ID of the received email'),
  recipientEmail: z.string().describe('The proxy email address that received the message'),
  senderEmail: z.string().describe('The sender email address'),
  subject: z.string().describe('Email subject line'),
  attachmentsCount: z.number().describe('Number of attachments'),
  isProcessed: z.boolean().describe('Whether the email has been processed'),
  createdAt: z.string().describe('Timestamp when the email was received')
});

export let browseReceivedEmails = SlateTool.create(spec, {
  name: 'Browse Received Emails',
  key: 'browse_received_emails',
  description: `List emails received by a specific proxy email address. Returns up to 55 recent emails with summary information including sender, subject, and attachment count. The proxy email must have browsing enabled (isBrowsable: true).`,
  constraints: [
    'Returns a maximum of 55 most recent emails.',
    'Only works for proxy emails with isBrowsable set to true.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      proxyBindingId: z
        .string()
        .describe('ID of the proxy email binding to browse received emails for')
    })
  )
  .output(
    z.object({
      emails: z.array(receivedEmailLinkSchema).describe('List of received email summaries'),
      totalCount: z.number().describe('Number of emails returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let emails = await client.listReceivedEmails(ctx.input.proxyBindingId);

    return {
      output: {
        emails,
        totalCount: emails.length
      },
      message: `Found **${emails.length}** received email(s) for proxy binding ${ctx.input.proxyBindingId}.`
    };
  })
  .build();
