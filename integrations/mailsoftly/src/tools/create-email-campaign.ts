import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let createEmailCampaign = SlateTool.create(spec, {
  name: 'Create Email Campaign',
  key: 'create_email_campaign',
  description: `Creates a new email campaign draft in Mailsoftly. Provide a subject line and either a contact list ID or a list of recipients. Optionally include email body content and attachments.`,
  instructions: [
    'Provide exactly one of contactListId or non-empty recipients.',
    'Attachments must be valid, publicly accessible HTTP/HTTPS URLs (max 20).',
    'Recipients and attachments are prepared asynchronously. Check get_email_campaigns until ready_to_send is true before sending.',
    'Call list_senders to select a sender. API keys cannot send through a teammate-owned Gmail or Microsoft mailbox.'
  ],
  constraints: [
    'Maximum of 20 attachments per email.',
    'Attachments must be valid public URLs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Email subject line.'),
      contactListId: z
        .string()
        .optional()
        .describe('ID of the contact list to send the email to.'),
      recipients: z
        .array(
          z.object({
            email: z.string().describe('Recipient email address.'),
            firstName: z
              .string()
              .optional()
              .describe('Recipient first name for personalization.'),
            lastName: z
              .string()
              .optional()
              .describe('Recipient last name for personalization.')
          })
        )
        .optional()
        .describe('List of individual recipients. A contact list will be auto-created.'),
      emailBody: z.string().optional().describe('Plain text email body content.'),
      htmlBody: z.string().optional().describe('HTML email body content.'),
      attachments: z
        .array(z.string())
        .max(20)
        .optional()
        .describe('Public URLs to attach to the email (max 20).'),
      senderName: z
        .string()
        .optional()
        .describe(
          'Name of an available sender from list_senders. Used with senderEmail to identify a sender.'
        ),
      senderEmail: z
        .string()
        .optional()
        .describe('Email of an available sender from list_senders.'),
      senderId: z
        .string()
        .optional()
        .describe('Team member sender ID from list_senders. Alternative to emailSenderId.'),
      emailSenderId: z
        .string()
        .optional()
        .describe('Mailbox or shared sender ID from list_senders. Alternative to senderId.'),
      replyTo: z
        .string()
        .optional()
        .describe(
          'Reply-to address. Connected Gmail or Microsoft mailboxes keep their own reply-to address.'
        )
    })
  )
  .output(
    z.object({
      campaign: z.any().describe('The created email campaign/draft.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    let campaign = await client.createEmail({
      subject: ctx.input.subject,
      contactListId: ctx.input.contactListId,
      recipients: ctx.input.recipients,
      body: ctx.input.emailBody,
      htmlBody: ctx.input.htmlBody,
      attachments: ctx.input.attachments,
      senderName: ctx.input.senderName,
      senderEmail: ctx.input.senderEmail,
      senderId: ctx.input.senderId,
      emailSenderId: ctx.input.emailSenderId,
      replyTo: ctx.input.replyTo
    });

    return {
      output: { campaign },
      message: `Created email campaign draft with subject **"${ctx.input.subject}"**.`
    };
  })
  .build();
