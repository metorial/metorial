import { SlateTool } from 'slates';
import { z } from 'zod';
import { GOOGLE_CHAT_API_BASE_URL } from '../lib/client';
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
        .describe('Google Chat attachment data resource name of the file'),
      filename: z.string().optional().describe('Original filename when provided'),
      mimeType: z.string().describe('MIME type of the file')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildDownloadAttachmentRequest(ctx.input.attachmentDataResourceName);
    let mimeType = ctx.input.mimeType ?? 'application/octet-stream';

    await ctx.addAttachment({
      type: 'url',
      url: `${GOOGLE_CHAT_API_BASE_URL}${request.path}`,
      query: request.params,
      mimeType,
      filename: ctx.input.filename,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });

    return {
      output: {
        attachmentDataResourceName: request.attachmentDataResourceName,
        filename: ctx.input.filename,
        mimeType
      },
      message: `Prepared${ctx.input.filename ? ` **${ctx.input.filename}**` : ' the Google Chat attachment'} for download.`
    };
  })
  .build();
