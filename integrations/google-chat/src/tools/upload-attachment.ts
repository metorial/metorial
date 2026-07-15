import { Buffer } from 'node:buffer';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { GOOGLE_CHAT_API_ORIGIN, GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import { resolveGoogleChatSpaceName } from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

export let GOOGLE_CHAT_MAX_ATTACHMENT_BYTES = 200 * 1024 * 1024;

export let decodeGoogleChatAttachmentBase64 = (value: string) => {
  let normalized = value.trim().replace(/\s/g, '');
  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw googleChatValidationError(
      'contentBase64 must be valid base64-encoded file content.'
    );
  }

  let bytes = Buffer.from(normalized, 'base64');
  let canonical = bytes.toString('base64').replace(/=+$/, '');
  if (bytes.length === 0 || canonical !== normalized.replace(/=+$/, '')) {
    throw googleChatValidationError(
      bytes.length === 0
        ? 'contentBase64 must contain at least one byte.'
        : 'contentBase64 must be valid base64-encoded file content.'
    );
  }
  if (bytes.byteLength > GOOGLE_CHAT_MAX_ATTACHMENT_BYTES) {
    throw googleChatValidationError('Google Chat attachment uploads are limited to 200 MB.');
  }
  return bytes;
};

export type UploadAttachmentInput = {
  space?: string;
  filename: string;
  mimeType: string;
  contentBase64: string;
};

export let buildUploadAttachmentRequest = (
  input: UploadAttachmentInput,
  defaultSpace?: string,
  boundary = `-------slate_google_chat_${Date.now()}_${Math.random().toString(36).slice(2)}`
) => {
  let parent = resolveGoogleChatSpaceName(input.space, defaultSpace);
  let filename = input.filename.trim();
  let mimeType = input.mimeType.trim();
  if (!filename) {
    throw googleChatValidationError('filename is required to upload an attachment.');
  }
  if (!mimeType || /[\r\n]/.test(mimeType)) {
    throw googleChatValidationError('mimeType must be a valid single-line MIME type.');
  }
  let bytes = decodeGoogleChatAttachmentBase64(input.contentBase64);
  let metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ filename })}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  let closingPart = Buffer.from(`\r\n--${boundary}--`);

  return {
    parent,
    filename,
    mimeType,
    byteLength: bytes.byteLength,
    path: `${GOOGLE_CHAT_API_ORIGIN}/upload/v1/${parent}/attachments:upload`,
    params: { uploadType: 'multipart' },
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    data: Buffer.concat([metadataPart, bytes, closingPart])
  };
};

export type GoogleChatUploadAttachmentResponse = {
  attachmentDataRef?: {
    resourceName?: string;
    attachmentUploadToken?: string;
  };
};

export let uploadAttachment = SlateTool.create(spec, {
  name: 'Upload Attachment',
  key: 'upload_attachment',
  description:
    'Upload base64-encoded file bytes to a Google Chat space and return the attachment data reference needed to include it in a message.',
  instructions: [
    'The target space must match the space where the subsequent message is sent.',
    'Pass attachmentUploadToken to send_message.attachmentUploadTokens when creating the message.'
  ],
  constraints: [
    'Google Chat limits uploaded attachments to 200 MB and blocks some file types.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.uploadAttachment)
  .authMethods(googleChatActionAuthMethods.uploadAttachment)
  .input(
    z.object({
      space: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Space ID or spaces/{space} resource name; defaults to defaultSpace'),
      filename: z.string().trim().min(1).describe('Filename including its extension'),
      mimeType: z
        .string()
        .trim()
        .min(1)
        .regex(/^[^\r\n]+$/)
        .describe('MIME type of the uploaded file'),
      contentBase64: z.string().min(1).describe('Base64-encoded file bytes')
    })
  )
  .output(
    z.object({
      spaceName: z.string().describe('Space that owns the uploaded attachment'),
      filename: z.string().describe('Uploaded filename'),
      mimeType: z.string().describe('Uploaded MIME type'),
      byteLength: z.number().int().positive().describe('Decoded upload size in bytes'),
      attachmentDataResourceName: z
        .string()
        .optional()
        .describe('Uploaded attachment data resource name, when returned by Google Chat'),
      attachmentUploadToken: z
        .string()
        .optional()
        .describe('Opaque attachment upload token used to include the file in a message')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildUploadAttachmentRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatUploadAttachmentResponse>(request.path, {
      method: 'post',
      params: request.params,
      headers: request.headers,
      data: request.data,
      operation: 'upload attachment'
    });
    let attachmentDataResourceName = response.attachmentDataRef?.resourceName;
    let attachmentUploadToken = response.attachmentDataRef?.attachmentUploadToken;
    if (!attachmentDataResourceName && !attachmentUploadToken) {
      throw googleChatValidationError(
        'Google Chat uploaded the attachment but returned no attachment data reference.'
      );
    }

    return {
      output: {
        spaceName: request.parent,
        filename: request.filename,
        mimeType: request.mimeType,
        byteLength: request.byteLength,
        attachmentDataResourceName,
        attachmentUploadToken
      },
      message: `Uploaded **${request.filename}** to \`${request.parent}\` (${request.byteLength} bytes).`
    };
  })
  .build();
