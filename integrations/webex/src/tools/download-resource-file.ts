import { createApiServiceError, getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { messageUrl, recordingFile, recordingReference, recordingUrl } from '../lib/files';
import { required } from '../lib/http';
import { spec } from '../spec';

export const downloadResourceFile = SlateTool.create(spec, {
  name: 'Download Webex File',
  key: 'download_resource_file',
  description:
    'Prepare an exact file from a message or an available meeting recording for download. Discover message files with get_message and recording IDs with list_recordings. Recording downloads require authorized access and downloading enabled; message files remain subject to Webex scanning.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['message', 'recording']),
      messageId: z
        .string()
        .optional()
        .describe('Message ID from get_message; required for message files'),
      fileIndex: z
        .number()
        .optional()
        .describe('Zero-based file position in get_message files; defaults to 0'),
      recordingId: z
        .string()
        .optional()
        .describe('Recording ID from list_recordings; required for recording files'),
      hostEmail: z
        .string()
        .optional()
        .describe('Recording host email for a previously authorized administrative connection')
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      fileIndex: z.number().optional(),
      expiresAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new WebexClient(ctx.auth);
    if (ctx.input.resource === 'message') {
      if (ctx.input.recordingId !== undefined || ctx.input.hostEmail !== undefined)
        throw createApiServiceError('Recording fields do not apply to a message file.');
      const id = required(ctx.input.messageId, 'messageId'),
        index = ctx.input.fileIndex ?? 0;
      if (!Number.isSafeInteger(index) || index < 0)
        throw createApiServiceError('fileIndex must be a non-negative integer.');
      const message = await client.getMessage(id),
        file = message.files?.[index];
      if (!file)
        throw createApiServiceError(
          'This message has no file at that position. Read get_message again.'
        );
      await ctx.addAttachment({
        type: 'url',
        url: messageUrl(file, ctx.auth.token),
        headers: { Authorization: `Bearer ${ctx.auth.token}` }
      });
      return {
        output: { resourceId: message.id, fileIndex: index },
        message: 'Message file prepared for download.'
      };
    }
    if (ctx.input.messageId !== undefined || ctx.input.fileIndex !== undefined)
      throw createApiServiceError('Message fields do not apply to a recording file.');
    const file = await recordingFile(
      client,
      ctx.auth.token,
      required(ctx.input.recordingId, 'recordingId'),
      ctx.input.hostEmail
    );
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      refreshAt: file.expiresAt,
      refreshReference: file.reference
    });
    return {
      output: { resourceId: file.reference.recordingId, expiresAt: file.expiresAt },
      message: 'Recording file prepared for download.'
    };
  })
  .build();

export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const parsed = recordingReference.safeParse(ctx.input.reference);
  if (!parsed.success)
    throw createApiServiceError('Invalid recording reference. Request the file again.');
  const expected = parsed.data;
  recordingUrl(ctx.input.url, expected.siteUrl, ctx.auth.token);
  const file = await recordingFile(
    new WebexClient(ctx.auth),
    ctx.auth.token,
    expected.recordingId,
    expected.hostEmail
  );
  if (JSON.stringify(file.reference) !== JSON.stringify(expected))
    throw createApiServiceError(
      'The recording identity, authenticated person, site or file metadata changed. Request a new file.'
    );
  return { url: file.url, expiresAt: file.expiresAt, headers: {}, query: {} };
});
