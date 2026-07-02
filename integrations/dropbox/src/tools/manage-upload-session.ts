import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { decodeDropboxContent, getDropboxContentLength } from '../lib/content';
import { dropboxServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageUploadSession = SlateTool.create(spec, {
  name: 'Manage Upload Session',
  key: 'manage_upload_session',
  description: `Start, append to, or finish a Dropbox upload session for larger or chunked uploads.`,
  constraints: [
    'Each Dropbox upload session request should upload at most 150 MiB.',
    'Upload sessions expire after 7 days.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['start', 'append', 'finish'])
        .describe('Upload session action to perform'),
      sessionId: z
        .string()
        .optional()
        .describe('Upload session ID. Required for "append" and "finish".'),
      offset: z
        .number()
        .optional()
        .describe('Current byte offset. Required for "append" and "finish".'),
      path: z
        .string()
        .optional()
        .describe('Destination path including filename. Required for "finish".'),
      content: z
        .string()
        .optional()
        .describe('Chunk content for this request. Defaults to empty content.'),
      contentEncoding: z
        .enum(['text', 'base64'])
        .optional()
        .describe(
          'How to decode content. Use "base64" for binary chunks. Defaults to "text".'
        ),
      close: z
        .boolean()
        .optional()
        .describe('For "start" or "append", close the session after this chunk'),
      mode: z
        .enum(['add', 'overwrite', 'update'])
        .optional()
        .describe('Commit mode for "finish". Defaults to "add".'),
      rev: z.string().optional().describe('Existing file revision required for update mode'),
      autorename: z.boolean().optional().describe('For "finish", autorename on conflicts'),
      mute: z.boolean().optional().describe('For "finish", suppress Dropbox notifications'),
      contentHash: z
        .string()
        .optional()
        .describe('Optional Dropbox content hash for this call'),
      clientModified: z
        .string()
        .optional()
        .describe('For "finish", optional ISO timestamp to store as client modified time')
    })
  )
  .output(
    z.object({
      sessionId: z.string().optional().describe('Upload session ID'),
      offset: z.number().optional().describe('Next byte offset after this chunk'),
      closed: z.boolean().optional().describe('Whether the session was closed by this action'),
      file: z
        .object({
          name: z.string().describe('Committed file name'),
          pathDisplay: z.string().optional().describe('Display path of the committed file'),
          fileId: z.string().optional().describe('Unique file ID'),
          size: z.number().describe('Committed file size in bytes'),
          rev: z.string().describe('Committed file revision'),
          contentHash: z.string().optional().describe('Dropbox content hash')
        })
        .optional()
        .describe('Committed file metadata returned by "finish"')
    })
  )
  .handleInvocation(async ctx => {
    let content = decodeDropboxContent(
      ctx.input.content ?? '',
      ctx.input.contentEncoding ?? 'text'
    );
    let contentLength = getDropboxContentLength(content);
    let client = new DropboxClient(ctx.auth.token);

    if (ctx.input.action === 'start') {
      let result = await client.startUploadSession(
        content,
        ctx.input.close ?? false,
        ctx.input.contentHash
      );

      return {
        output: {
          sessionId: result.session_id,
          offset: contentLength,
          closed: ctx.input.close ?? false
        },
        message: `Started Dropbox upload session **${result.session_id}**.`
      };
    }

    if (!ctx.input.sessionId) {
      throw dropboxServiceError('sessionId is required for append and finish actions.');
    }
    if (ctx.input.offset === undefined) {
      throw dropboxServiceError('offset is required for append and finish actions.');
    }

    if (ctx.input.action === 'append') {
      await client.appendUploadSession(
        ctx.input.sessionId,
        ctx.input.offset,
        content,
        ctx.input.close ?? false,
        ctx.input.contentHash
      );

      return {
        output: {
          sessionId: ctx.input.sessionId,
          offset: ctx.input.offset + contentLength,
          closed: ctx.input.close ?? false
        },
        message: `Appended **${contentLength}** bytes to Dropbox upload session.`
      };
    }

    if (!ctx.input.path) {
      throw dropboxServiceError('path is required to finish an upload session.');
    }
    if (ctx.input.mode === 'update' && !ctx.input.rev) {
      throw dropboxServiceError('rev is required when finish mode is "update".');
    }

    let result = await client.finishUploadSession(
      ctx.input.sessionId,
      ctx.input.offset,
      ctx.input.path,
      content,
      {
        mode: ctx.input.mode ?? 'add',
        rev: ctx.input.rev,
        autorename: ctx.input.autorename,
        mute: ctx.input.mute,
        contentHash: ctx.input.contentHash,
        clientModified: ctx.input.clientModified
      }
    );

    return {
      output: {
        sessionId: ctx.input.sessionId,
        offset: ctx.input.offset + contentLength,
        closed: true,
        file: {
          name: result.name,
          pathDisplay: result.path_display,
          fileId: result.id,
          size: result.size,
          rev: result.rev,
          contentHash: result.content_hash
        }
      },
      message: `Finished Dropbox upload session and committed **${result.name}**.`
    };
  })
  .build();
