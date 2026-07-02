import { createApiServiceError, createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attachmentOutputSchema = z.object({
  attachmentId: z.string().describe('Attachment ID.'),
  filename: z.string().optional().describe('Filename.'),
  contentType: z.string().optional().describe('MIME type.'),
  contentDisposition: z.string().optional().nullable().describe('Content disposition.'),
  contentId: z.string().optional().nullable().describe('Content ID for inline attachments.'),
  size: z.number().optional().describe('File size in bytes.'),
  expiresAt: z.string().optional().describe('When the signed download URL expires.')
});

let mapAttachment = (attachment: any) => ({
  attachmentId: attachment.id,
  filename: attachment.filename,
  contentType: attachment.content_type,
  contentDisposition: attachment.content_disposition,
  contentId: attachment.content_id,
  size: attachment.size,
  expiresAt: attachment.expires_at
});

export let listEmailAttachments = SlateTool.create(spec, {
  name: 'List Email Attachments',
  key: 'list_email_attachments',
  description: `List attachments for a sent or received Resend email. Use Download Email Attachment to fetch file contents as a Slate attachment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      source: z
        .enum(['sent', 'received'])
        .describe('Whether the email is a sent email or a received inbound email.'),
      emailId: z.string().describe('Email ID.')
    })
  )
  .output(
    z.object({
      attachments: z.array(attachmentOutputSchema).describe('Attachment metadata.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result =
      ctx.input.source === 'sent'
        ? await client.listEmailAttachments(ctx.input.emailId)
        : await client.listReceivedEmailAttachments(ctx.input.emailId);

    let attachments = (result.data || []).map(mapAttachment);

    return {
      output: {
        attachments,
        hasMore: result.has_more ?? false
      },
      message: `Found **${attachments.length}** attachment(s).`
    };
  })
  .build();

export let downloadEmailAttachment = SlateTool.create(spec, {
  name: 'Download Email Attachment',
  key: 'download_email_attachment',
  description: `Download one sent or received Resend email attachment. File bytes are returned through Slate attachments, not inline output.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      source: z
        .enum(['sent', 'received'])
        .describe('Whether the email is a sent email or a received inbound email.'),
      emailId: z.string().describe('Email ID.'),
      attachmentId: z.string().describe('Attachment ID.')
    })
  )
  .output(
    z.object({
      attachmentId: z.string().describe('Attachment ID.'),
      filename: z.string().optional().describe('Filename.'),
      contentType: z.string().describe('MIME type of the returned attachment.'),
      size: z.number().describe('Downloaded attachment size in bytes.'),
      attachmentCount: z.number().describe('Number of Slate attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let metadata =
      ctx.input.source === 'sent'
        ? await client.getEmailAttachment(ctx.input.emailId, ctx.input.attachmentId)
        : await client.getReceivedEmailAttachment(ctx.input.emailId, ctx.input.attachmentId);

    if (!metadata.download_url) {
      throw createApiServiceError('Resend did not return a download URL for this attachment.');
    }

    let downloaded = await client.downloadAttachment(metadata.download_url);
    let contentType = metadata.content_type ?? downloaded.contentType;

    return {
      output: {
        attachmentId: metadata.id,
        filename: metadata.filename,
        contentType,
        size: downloaded.size,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(downloaded.contentBase64, contentType)],
      message: `Downloaded attachment \`${metadata.id}\` as a Slate attachment.`
    };
  })
  .build();
