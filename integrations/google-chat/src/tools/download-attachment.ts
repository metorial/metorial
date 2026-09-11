import { Buffer } from 'node:buffer';
import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

let attachmentDataNamePattern =
  /^spaces\/[^/\s?#]+\/(?:messages\/[^/\s?#]+\/)?attachments\/[^/\s?#]+$/;
// Live attachmentDataRef.resourceName values are opaque base64 media tokens
// (e.g. "ClxzcGFjZXMv..."), not spaces/... names — verified against the real
// API on 2026-07-15. Restrict them to base64 characters so the value stays a
// safe media/{resourceName} path.
let opaqueMediaTokenPattern = /^[A-Za-z0-9+/_-]+={0,2}$/;

export let resolveGoogleChatAttachmentDataName = (resourceName: string) => {
  let resolved = resourceName.trim();
  let hasUnsafePathSegment =
    resolved.includes('\\') ||
    /%(?:2e|2f|5c)/i.test(resolved) ||
    resolved.split('/').some(segment => segment === '.' || segment === '..');
  let hasAllowedShape =
    attachmentDataNamePattern.test(resolved) || opaqueMediaTokenPattern.test(resolved);
  if (!hasAllowedShape || hasUnsafePathSegment) {
    throw googleChatValidationError(
      'attachmentDataResourceName must be a safe uploaded Google Chat attachment data resource: the opaque attachmentDataRef.resourceName token, or a name under spaces/{space}/attachments/{attachment} or spaces/{space}/messages/{message}/attachments/{attachment}.'
    );
  }
  return resolved;
};

export let buildDownloadAttachmentRequest = (resourceName: string) => {
  let attachmentDataResourceName = resolveGoogleChatAttachmentDataName(resourceName);
  return {
    attachmentDataResourceName,
    path: `media/${attachmentDataResourceName}`,
    params: { alt: 'media' }
  };
};

export let downloadAttachment = SlateTool.create(spec, {
  name: 'Download Attachment',
  key: 'download_attachment',
  description: 'Download an uploaded Google Chat attachment as a downloadable file.',
  constraints: [
    'This endpoint downloads Google Chat uploaded content only. Use the Google Drive integration for DRIVE_FILE attachments.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.downloadAttachment)
  .authMethods(googleChatActionAuthMethods.downloadAttachment)
  .input(
    z.object({
      attachmentDataResourceName: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Uploaded-content resourceName from attachmentDataRef or a Google Chat message read result'
        ),
      filename: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Original filename for the downloaded file'),
      mimeType: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Attachment MIME type; defaults to application/octet-stream')
    })
  )
  .output(
    z.object({
      attachmentDataResourceName: z
        .string()
        .describe('Downloaded Google Chat attachment data resource name'),
      filename: z.string().optional().describe('Original filename when provided'),
      mimeType: z.string().describe('MIME type of the downloaded file'),
      byteLength: z.number().int().nonnegative().describe('Downloaded byte count')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildDownloadAttachmentRequest(ctx.input.attachmentDataResourceName);
    let client = new GoogleChatClient(ctx.auth.token);
    let content = await client.request<ArrayBuffer>(request.path, {
      method: 'get',
      params: request.params,
      responseType: 'arraybuffer',
      operation: 'download attachment'
    });
    let bytes = Buffer.from(content);
    let mimeType = ctx.input.mimeType ?? 'application/octet-stream';

    return {
      output: {
        attachmentDataResourceName: request.attachmentDataResourceName,
        filename: ctx.input.filename,
        mimeType,
        byteLength: bytes.byteLength
      },
      message: `Downloaded${ctx.input.filename ? ` **${ctx.input.filename}**` : ' Google Chat attachment'} (${bytes.byteLength} bytes).`,
      attachments: [createBase64Attachment(bytes.toString('base64'), mimeType)]
    };
  })
  .build();
