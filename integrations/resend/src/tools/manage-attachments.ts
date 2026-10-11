import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  getEmailAttachmentMetadata,
  getRefreshAt,
  type ResendFileReference
} from '../lib/files';
import { spec } from '../spec';

let attachmentOutputSchema = z.object({
  attachmentId: z.string().describe('Attachment ID.'),
  filename: z.string().optional().describe('Filename.'),
  contentType: z.string().optional().describe('MIME type.'),
  contentDisposition: z.string().optional().nullable().describe('Content disposition.'),
  contentId: z.string().optional().nullable().describe('Content ID for inline attachments.'),
  size: z.number().optional().describe('File size in bytes.'),
  expiresAt: z
    .string()
    .optional()
    .describe(
      "When Resend's temporary download link for this attachment expires. Download Email Attachment always provides a current file."
    )
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
  description: `List attachments for a sent or received Resend email. Use Download Email Attachment to get one attachment as a downloadable file.`,
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
  description: `Download one sent or received Resend email attachment as a downloadable file. The output contains the attachment metadata; use List Email Attachments to find attachment IDs.`,
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
      contentType: z.string().describe('MIME type of the attachment.'),
      contentDisposition: z
        .string()
        .optional()
        .nullable()
        .describe('Content disposition, such as inline or attachment.'),
      contentId: z
        .string()
        .optional()
        .nullable()
        .describe('Content ID for inline attachments.'),
      size: z.number().optional().describe('Attachment size in bytes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let reference: ResendFileReference = {
      type: 'email_attachment',
      source: ctx.input.source,
      emailId: ctx.input.emailId,
      attachmentId: ctx.input.attachmentId
    };
    let metadata = await getEmailAttachmentMetadata(client, reference);
    let contentType = metadata.content_type ?? 'application/octet-stream';

    await ctx.addAttachment({
      type: 'url',
      url: metadata.download_url,
      mimeType: contentType,
      filename: metadata.filename,
      refreshReference: reference,
      refreshAt: getRefreshAt(metadata.expires_at)
    });

    return {
      output: {
        attachmentId: metadata.id,
        filename: metadata.filename,
        contentType,
        contentDisposition: metadata.content_disposition,
        contentId: metadata.content_id,
        size: metadata.size
      },
      message: `Prepared attachment **${metadata.filename ?? metadata.id}** for download.`
    };
  })
  .build();
