import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { spec } from '../spec';

export let downloadConversationAttachment = SlateTool.create(spec, {
  name: 'Download Conversation Attachment',
  key: 'download_conversation_attachment',
  description: `Download a file attached to a conversation thread (customer message, reply, note, phone, or chat) as a downloadable file. Call get_conversation first to find the attachment ID in the thread's attachments.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationId: z.number().describe('The conversation ID that contains the attachment'),
      attachmentId: z
        .number()
        .describe(
          'Attachment ID from a thread in get_conversation (threads[].attachments[].attachmentId)'
        )
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Conversation ID'),
      threadId: z.number().describe('Thread ID the file is attached to'),
      attachmentId: z.number().describe('Attachment ID'),
      fileName: z.string().nullable().describe('File name'),
      mimeType: z.string().nullable().describe('MIME type'),
      size: z.number().nullable().describe('File size in bytes, when reported')
    })
  )
  .handleInvocation(async ctx => {
    let { conversationId, attachmentId } = ctx.input;
    let client = new HelpScoutClient(ctx.auth.token);

    let found = await client.findThreadAttachment(conversationId, attachmentId);
    if (!found) {
      throw helpscoutServiceError(
        `Attachment ${attachmentId} was not found on conversation ${conversationId}. Call get_conversation to list the attachment IDs on its threads.`
      );
    }

    let { threadId, attachment } = found;
    let fileName: string | null = attachment.filename ?? attachment.fileName ?? null;
    let mimeType: string | null = attachment.mimeType ?? null;

    await ctx.addAttachment({
      type: 'url',
      url: client.getAttachmentFileUrl(conversationId, attachmentId),
      mimeType: mimeType ?? 'application/octet-stream',
      filename: fileName ?? undefined,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });

    return {
      output: {
        conversationId,
        threadId,
        attachmentId,
        fileName,
        mimeType,
        size: typeof attachment.size === 'number' ? attachment.size : null
      },
      message: `Prepared **${fileName ?? `attachment ${attachmentId}`}** from conversation ${conversationId} for download.`
    };
  })
  .build();
