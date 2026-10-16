import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description:
    'Upload a file to Zulip and get its provider URL. Initially only the uploader can access it; send a message containing the returned URL to share it. Large uploads may exceed the server size limit or time out.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      filename: z.string().describe('Name of the file to upload'),
      contentBase64: z
        .string()
        .describe('File bytes encoded as standard base64, without a data URL prefix'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type of the file, such as image/png or application/pdf')
    })
  )
  .output(
    z.object({
      url: z
        .string()
        .describe('Actual file URL returned by Zulip, which can be server relative'),
      filename: z.string().optional().describe('Filename returned by Zulip'),
      bytesUploaded: z
        .number()
        .describe('Number of file bytes submitted in the accepted upload'),
      raw: z.any().describe('Complete provider upload metadata')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.filename.trim()) {
      throw createApiServiceError('Provide a filename for the upload.');
    }
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        ctx.input.contentBase64
      )
    ) {
      throw createApiServiceError(
        'Provide valid standard base64 file content without a data URL prefix.'
      );
    }
    let bytes = Buffer.from(ctx.input.contentBase64, 'base64');
    let result = await new Client(ctx.auth).uploadFile(
      ctx.input.filename,
      bytes,
      ctx.input.mimeType ?? 'application/octet-stream'
    );
    return {
      output: {
        url: result.url ?? result.uri,
        filename: result.filename,
        bytesUploaded: getBase64ByteLength(ctx.input.contentBase64),
        raw: result
      },
      message: 'File uploaded to Zulip. Include the returned URL in a message to share it.'
    };
  })
  .build();
