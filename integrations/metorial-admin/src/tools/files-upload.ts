import { Buffer } from 'node:buffer';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveMetorialRuntimeConfig } from '../config';
import { MetorialClient } from '../lib/client';
import { INSTANCE_ID_DESCRIPTION } from '../lib/contractTools';
import { metorialValidationError } from '../lib/errors';
import { spec } from '../spec';

let MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
let MAX_UPLOAD_BASE64_LENGTH = Math.ceil(MAX_UPLOAD_BYTES / 3) * 4;
let UPLOAD_LIMIT_MESSAGE = 'Metorial file uploads through this tool are limited to 5 MB.';

let FILE_PURPOSES = [
  'generic',
  'skill_image',
  'skill_export',
  'chat_message_attachment',
  'sandbox_image_build_context'
] as const;

let decodeFile = (value: string) => {
  let dataUri = /^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/s.exec(value.trim());
  let base64 = (dataUri ? dataUri[2]! : value).replace(/\s/g, '');
  if (base64.length > MAX_UPLOAD_BASE64_LENGTH) {
    throw metorialValidationError(UPLOAD_LIMIT_MESSAGE);
  }
  if (!base64 || base64.length % 4 === 1 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw metorialValidationError('fileBase64 must be a valid base64-encoded file.');
  }

  let bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0) {
    throw metorialValidationError('fileBase64 must contain at least one byte.');
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw metorialValidationError(UPLOAD_LIMIT_MESSAGE);
  }

  return { bytes, contentType: dataUri?.[1] };
};

export let filesUpload = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'files_upload',
  description:
    'Upload a base64-encoded file to a Metorial instance. Returns the created file, whose ID can be used by skills, sandboxes, chat messages, and file links.',
  constraints: ['Maximum upload size is 5 MB.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fileBase64: z
        .string()
        .describe('Base64-encoded file bytes. Data URI prefixes are accepted.'),
      filename: z.string().min(1).describe('File name to store, such as report.pdf.'),
      contentType: z
        .string()
        .optional()
        .describe(
          'MIME content type, such as application/pdf. Defaults to the data URI type or application/octet-stream.'
        ),
      purpose: z
        .enum(FILE_PURPOSES)
        .optional()
        .default('generic')
        .describe('What the file is for. Defaults to generic.'),
      title: z.string().optional().describe('Human-readable title for the file.'),
      instance_id: z.string().optional().describe(INSTANCE_ID_DESCRIPTION)
    })
  )
  .output(
    z.object({
      fileId: z.string().optional().describe('ID of the uploaded file.'),
      file: z
        .record(z.string(), z.unknown())
        .describe('Complete file record returned by Metorial.')
    })
  )
  .handleInvocation(async ctx => {
    let { bytes, contentType } = decodeFile(ctx.input.fileBase64);
    let client = new MetorialClient(resolveMetorialRuntimeConfig(ctx.config, ctx.auth));
    let file = await client.uploadFile({
      token: ctx.auth.token,
      instanceId: ctx.input.instance_id,
      purpose: ctx.input.purpose,
      title: ctx.input.title,
      filename: ctx.input.filename,
      contentType: ctx.input.contentType ?? contentType ?? 'application/octet-stream',
      bytes
    });
    let fileId = typeof file.id === 'string' ? file.id : undefined;

    return {
      output: { fileId, file },
      message: `Uploaded **${ctx.input.filename}**${fileId ? ` as file **${fileId}**` : ''}.`
    };
  })
  .build();
