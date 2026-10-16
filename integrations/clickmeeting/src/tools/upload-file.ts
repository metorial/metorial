import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  key: 'upload_file',
  name: 'Upload File',
  description:
    'Uploads a file to the account file library or to a specific conference room. Returns the original file metadata, including conversion status.'
})
  .input(
    z.object({
      filename: z.string().describe('Name of the file, including its extension'),
      contentBase64: z
        .string()
        .describe('File bytes encoded as base64, without a data URL prefix'),
      mimeType: z
        .string()
        .optional()
        .describe('Content MIME type; defaults to application/octet-stream'),
      roomId: z
        .string()
        .optional()
        .describe(
          'Conference room ID. Call list_conferences to discover rooms; omit for the account library'
        )
    })
  )
  .output(
    z.object({
      file: z
        .record(z.string(), z.unknown())
        .describe('Original uploaded-file metadata from the provider')
    })
  )
  .handleInvocation(async ctx => {
    let content = ctx.input.contentBase64.replace(/\s/g, '');
    if (
      !ctx.input.filename.trim() ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(content) ||
      content.length % 4 === 1
    ) {
      throw createApiServiceError('Provide a filename and valid base64 file content.');
    }
    let size = getBase64ByteLength(content);
    let bytes = Buffer.from(content, 'base64');
    if (
      size === 0 ||
      bytes.toString('base64').replace(/=+$/, '') !== content.replace(/=+$/, '')
    ) {
      throw createApiServiceError('Provide non-empty, valid base64 file content.');
    }
    let data = new FormData();
    data.append(
      'uploaded',
      new Blob([bytes], { type: ctx.input.mimeType ?? 'application/octet-stream' }),
      ctx.input.filename
    );
    let file = await new Client({ token: ctx.auth.token }).uploadFile(data, ctx.input.roomId);
    return {
      output: { file },
      message: `Uploaded **${ctx.input.filename}**. Check the returned conversion status before presenting the file.`
    };
  })
  .build();
