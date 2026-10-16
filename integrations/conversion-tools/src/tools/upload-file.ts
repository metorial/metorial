import { createApiServiceError, getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description:
    'Uploads a source file to Conversion Tools and returns its file ID for Convert File. Provide the original filename and Base64-encoded file bytes.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      fileName: z
        .string()
        .describe('Original filename including its extension, without a directory path'),
      contentBase64: z
        .string()
        .describe('File bytes encoded as Base64, without a data URL prefix')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Uploaded file ID to pass to Convert File'),
      fileName: z.string().describe('Original filename'),
      fileSize: z.number().describe('Uploaded file size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.fileName.trim() || /[\r\n/\\]/.test(ctx.input.fileName)) {
      throw createApiServiceError(
        'fileName must be a filename without a directory path or line breaks.'
      );
    }
    let encoded = ctx.input.contentBase64;
    if (
      !encoded ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}(?:==)?|[A-Za-z0-9+/]{3}=?)?$/.test(encoded)
    ) {
      throw createApiServiceError(
        'contentBase64 must contain valid Base64-encoded file bytes, without a data URL prefix.'
      );
    }
    let fileSize = getBase64ByteLength(encoded);
    let client = new Client({ token: ctx.auth.token });
    let fileId = await client.uploadFile(Buffer.from(encoded, 'base64'), ctx.input.fileName);
    return {
      output: { fileId, fileName: ctx.input.fileName, fileSize },
      message: `File uploaded. Use file ID \`${fileId}\` with Convert File.`
    };
  })
  .build();
