import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAttachment = SlateTool.create(spec, {
  name: 'Get Attachment',
  key: 'get_attachment',
  description: `Get a presigned download URL for an email attachment. The URL is temporary and expires after a set time. You can look up attachments from either a message or a thread.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox containing the message or thread'),
      attachmentId: z.string().describe('ID of the attachment to download'),
      messageId: z
        .string()
        .optional()
        .describe('Message ID (provide either messageId or threadId)'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID (provide either messageId or threadId)')
    })
  )
  .output(
    z.object({
      attachmentId: z.string().describe('Attachment identifier'),
      filename: z.string().describe('Original filename'),
      size: z.number().describe('File size in bytes'),
      contentType: z.string().optional().describe('MIME type'),
      downloadUrl: z.string().describe('Presigned URL for downloading the attachment'),
      expiresAt: z.string().describe('When the download URL expires')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let attachment: any;
    if (ctx.input.messageId) {
      attachment = await client.getMessageAttachment(
        ctx.input.inboxId,
        ctx.input.messageId,
        ctx.input.attachmentId
      );
    } else if (ctx.input.threadId) {
      attachment = await client.getThreadAttachment(
        ctx.input.inboxId,
        ctx.input.threadId,
        ctx.input.attachmentId
      );
    } else {
      throw new Error('Either messageId or threadId must be provided');
    }

    return {
      output: {
        attachmentId: attachment.attachment_id,
        filename: attachment.filename,
        size: attachment.size,
        contentType: attachment.content_type,
        downloadUrl: attachment.download_url,
        expiresAt: attachment.expires_at
      },
      message: `Got download URL for **${attachment.filename}** (${attachment.size} bytes). URL expires at ${attachment.expires_at}.`
    };
  })
  .build();
