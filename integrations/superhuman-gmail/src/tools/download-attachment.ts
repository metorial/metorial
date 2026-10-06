import { basename } from 'node:path';
import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GMAIL_FULL, GMAIL_MODIFY, GMAIL_READ } from '../auth';
import { Client, leafParts, requireIdentifier } from '../lib/client';
import { validateHeader } from '../lib/mime';
import { spec } from '../spec';

export const downloadAttachment = SlateTool.create(spec, {
  key: 'download_attachment',
  name: 'Download Message Attachment',
  description:
    'Download a file from a Gmail message using the attachment ID or MIME part ID returned by conversation context.',
  instructions: [
    'Provide messageId and exactly one of attachmentId or partId. Part IDs also support small files stored directly in the message.'
  ],
  tags: { readOnly: true }
})
  .scopes(anyOf(GMAIL_FULL, GMAIL_MODIFY, GMAIL_READ))
  .input(
    z.object({
      messageId: z.string().describe('Message containing the file.'),
      attachmentId: z
        .string()
        .optional()
        .describe('Attachment ID returned by conversation context.'),
      partId: z
        .string()
        .optional()
        .describe(
          'MIME part ID returned by conversation context, including an empty root part ID when supplied.'
        )
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      attachmentId: z.string().optional(),
      partId: z.string().optional(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number()
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.attachmentId === undefined) === (ctx.input.partId === undefined))
      throw createApiServiceError('Provide exactly one of attachmentId or partId.');
    if (ctx.input.attachmentId !== undefined)
      requireIdentifier(ctx.input.attachmentId, 'attachmentId');
    const client = new Client({ token: ctx.auth.token, userId: ctx.config.userId });
    const message = await client.getMessage(ctx.input.messageId);
    const matches = leafParts(message.payload).filter(
      part =>
        part.filename &&
        (ctx.input.attachmentId !== undefined
          ? part.body?.attachmentId === ctx.input.attachmentId
          : part.partId === ctx.input.partId)
    );
    if (matches.length !== 1 || !matches[0])
      throw createApiServiceError(
        'The requested file does not uniquely belong to this message. Use IDs from conversation context.'
      );
    const part = matches[0];
    const filename = basename(part.filename ?? '').replace(/\\/g, '_');
    if (!filename || filename === '.' || filename === '..')
      throw createApiServiceError('The file has an invalid filename.');
    validateHeader(filename, 'filename');
    const mimeType = part.mimeType ?? 'application/octet-stream';
    if (!/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/.test(mimeType))
      throw createApiServiceError('The file has an invalid MIME type.');
    const bytes = await client.partBytes(message.id, part);
    await ctx.addAttachment({
      type: 'content',
      filename,
      mimeType,
      content: new Response(new Uint8Array(bytes), { headers: { 'Content-Type': mimeType } })
    });
    return {
      output: {
        messageId: message.id,
        attachmentId: part.body?.attachmentId,
        partId: part.partId,
        filename,
        mimeType,
        size: bytes.length
      },
      message: `Prepared ${filename} for download.`
    };
  });
