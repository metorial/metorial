import { Buffer } from 'node:buffer';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { airtableServiceError } from '../lib/errors';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

let MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

let normalizeBase64 = (value: string) => {
  let dataUriMatch = /^data:([^;,]+);base64,(.*)$/s.exec(value.trim());
  let base64 = dataUriMatch ? dataUriMatch[2]! : value;
  return base64.replace(/\s/g, '');
};

let decodeBase64File = (value: string) => {
  let normalized = normalizeBase64(value);
  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw airtableServiceError('fileBase64 must be a valid base64-encoded file.');
  }

  let bytes = Buffer.from(normalized, 'base64');
  if (bytes.length === 0) {
    throw airtableServiceError('fileBase64 must contain at least one byte.');
  }
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    throw airtableServiceError('Airtable direct attachment uploads are limited to 5 MB.');
  }

  return {
    normalized,
    bytes
  };
};

export let uploadAttachmentTool = SlateTool.create(spec, {
  name: 'Upload Attachment',
  key: 'upload_attachment',
  description:
    'Upload a base64-encoded file directly into an Airtable attachment field on an existing record.',
  instructions: [
    'Use this for files up to 5 MB. For larger public files, update the attachment field with URL attachment objects instead.',
    'attachmentFieldIdOrName can be an attachment field ID or name. Airtable returns response fields keyed by field ID.'
  ],
  constraints: ['Maximum direct upload size is 5 MB.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      baseId: baseIdInput,
      recordId: z.string().describe('Record ID to attach the file to (e.g. recXXXXXX)'),
      attachmentFieldIdOrName: z
        .string()
        .describe('Attachment field ID or field name to receive the uploaded file'),
      fileBase64: z
        .string()
        .describe('Base64-encoded file bytes. Data URI prefixes are accepted.'),
      filename: z.string().describe('Filename to store in Airtable, e.g. sample.txt'),
      contentType: z.string().describe('MIME content type, e.g. text/plain or image/png')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('Record ID'),
      createdTime: z.string().describe('Record creation timestamp'),
      fields: z
        .record(z.string(), z.any())
        .describe('Updated record fields returned by Airtable, keyed by field ID'),
      attachmentFieldValue: z
        .any()
        .optional()
        .describe('Attachment field value when it can be read by the provided field key')
    })
  )
  .handleInvocation(async ctx => {
    let { normalized } = decodeBase64File(ctx.input.fileBase64);
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    let record = await client.uploadAttachment(
      ctx.input.recordId,
      ctx.input.attachmentFieldIdOrName,
      normalized,
      ctx.input.filename,
      ctx.input.contentType
    );

    return {
      output: {
        recordId: record.id,
        createdTime: record.createdTime,
        fields: record.fields,
        attachmentFieldValue: record.fields[ctx.input.attachmentFieldIdOrName]
      },
      message: `Uploaded **${ctx.input.filename}** to attachment field **${ctx.input.attachmentFieldIdOrName}** on record **${record.id}**.`
    };
  })
  .build();
