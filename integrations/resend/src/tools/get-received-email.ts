import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attachmentSchema = z.object({
  attachmentId: z.string().describe('Attachment ID.'),
  filename: z.string().optional().describe('Filename.'),
  contentType: z.string().optional().describe('MIME type.'),
  contentDisposition: z.string().optional().nullable().describe('Content disposition.'),
  contentId: z.string().optional().nullable().describe('Content ID for inline attachments.'),
  size: z.number().optional().describe('File size in bytes.')
});

export let listReceivedEmails = SlateTool.create(spec, {
  name: 'List Received Emails',
  key: 'list_received_emails',
  description: `List inbound emails received on your verified domains.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      emails: z
        .array(
          z.object({
            emailId: z.string().describe('Email ID.'),
            from: z.string().describe('Sender address.'),
            to: z.array(z.string()).describe('Recipient addresses.'),
            subject: z.string().optional().describe('Email subject.'),
            createdAt: z.string().optional().describe('Reception timestamp.'),
            cc: z.array(z.string()).optional().nullable().describe('CC recipients.'),
            bcc: z.array(z.string()).optional().nullable().describe('BCC recipients.'),
            attachments: z
              .array(attachmentSchema)
              .optional()
              .nullable()
              .describe('Attachments.')
          })
        )
        .describe('List of received emails.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listReceivedEmails({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let emails = (result.data || []).map((e: any) => ({
      emailId: e.id,
      from: e.from,
      to: e.to,
      subject: e.subject,
      createdAt: e.created_at,
      cc: e.cc,
      bcc: e.bcc,
      attachments: e.attachments?.map((a: any) => ({
        attachmentId: a.id,
        filename: a.filename,
        contentType: a.content_type,
        contentDisposition: a.content_disposition,
        contentId: a.content_id,
        size: a.size
      }))
    }));

    return {
      output: {
        emails,
        hasMore: result.has_more ?? false
      },
      message: `Found **${emails.length}** received email(s).`
    };
  })
  .build();

export let getReceivedEmail = SlateTool.create(spec, {
  name: 'Get Received Email',
  key: 'get_received_email',
  description: `Retrieve the full details of a received inbound email including HTML/text content and attachments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emailId: z.string().describe('ID of the received email.')
    })
  )
  .output(
    z.object({
      emailId: z.string().describe('Email ID.'),
      from: z.string().describe('Sender address.'),
      to: z.array(z.string()).describe('Recipient addresses.'),
      subject: z.string().optional().describe('Email subject.'),
      html: z.string().optional().nullable().describe('HTML content.'),
      text: z.string().optional().nullable().describe('Plain text content.'),
      cc: z.array(z.string()).optional().nullable().describe('CC recipients.'),
      bcc: z.array(z.string()).optional().nullable().describe('BCC recipients.'),
      replyTo: z.array(z.string()).optional().nullable().describe('Reply-to addresses.'),
      createdAt: z.string().optional().describe('Reception timestamp.'),
      messageId: z.string().optional().describe('Message ID header.'),
      attachments: z.array(attachmentSchema).optional().nullable().describe('Attachments.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let e = await client.getReceivedEmail(ctx.input.emailId);

    return {
      output: {
        emailId: e.id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        html: e.html,
        text: e.text,
        cc: e.cc,
        bcc: e.bcc,
        replyTo: e.reply_to,
        createdAt: e.created_at,
        messageId: e.message_id,
        attachments: e.attachments?.map((a: any) => ({
          attachmentId: a.id,
          filename: a.filename,
          contentType: a.content_type,
          contentDisposition: a.content_disposition,
          contentId: a.content_id,
          size: a.size
        }))
      },
      message: `Received email from **${e.from}** — subject: **${e.subject || '(no subject)'}**.`
    };
  })
  .build();
