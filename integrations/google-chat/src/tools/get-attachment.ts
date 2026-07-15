import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatAttachmentName,
  resolveGoogleChatMessageName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

export type GoogleChatAttachmentMetadata = {
  name?: string;
  contentName?: string;
  contentType?: string;
  thumbnailUri?: string;
  downloadUri?: string;
  source?: string;
  attachmentDataRef?: {
    resourceName?: string;
    attachmentUploadToken?: string;
  };
  driveDataRef?: {
    driveFileId?: string;
  };
};

export let googleChatAttachmentMetadataOutputSchema = z.object({
  attachmentName: z.string().describe('Full Google Chat attachment resource name'),
  filename: z.string().optional().describe('Original attachment filename'),
  mimeType: z.string().optional().describe('Attachment MIME type'),
  source: z.string().optional().describe('Attachment source'),
  thumbnailUri: z.string().optional().describe('Human-facing thumbnail URI'),
  downloadUri: z.string().optional().describe('Human-facing download URI'),
  attachmentDataResourceName: z
    .string()
    .optional()
    .describe('Uploaded-content resource name accepted by download_attachment'),
  attachmentUploadToken: z
    .string()
    .optional()
    .describe('Opaque token used to include an uploaded attachment in a message'),
  driveFileId: z
    .string()
    .optional()
    .describe('Google Drive file ID when the attachment source is DRIVE_FILE')
});

export let mapGoogleChatAttachmentMetadata = (attachment: GoogleChatAttachmentMetadata) => {
  let attachmentName = attachment.name?.trim();
  if (!attachmentName) {
    throw googleChatValidationError(
      'Google Chat returned attachment metadata without its required resource name.'
    );
  }

  return {
    attachmentName,
    filename: attachment.contentName,
    mimeType: attachment.contentType,
    source: attachment.source,
    thumbnailUri: attachment.thumbnailUri,
    downloadUri: attachment.downloadUri,
    attachmentDataResourceName: attachment.attachmentDataRef?.resourceName,
    attachmentUploadToken: attachment.attachmentDataRef?.attachmentUploadToken,
    driveFileId: attachment.driveDataRef?.driveFileId
  };
};

export type GetAttachmentInput = {
  attachment: string;
  message?: string;
  space?: string;
};

export let buildGetAttachmentRequest = (input: GetAttachmentInput, defaultSpace?: string) => {
  let messageName = input.message
    ? resolveGoogleChatMessageName(input.message, input.space ?? defaultSpace)
    : undefined;
  let attachmentName = resolveGoogleChatAttachmentName(input.attachment, messageName);
  if (messageName && !attachmentName.startsWith(`${messageName}/attachments/`)) {
    throw googleChatValidationError(
      'attachment must belong to the message supplied for this request.'
    );
  }
  return {
    attachmentName
  };
};

export let getAttachment = SlateTool.create(spec, {
  name: 'Get Attachment',
  key: 'get_attachment',
  description:
    'Get metadata for a Google Chat message attachment. File bytes are retrieved separately with download_attachment.',
  constraints: [
    'Google requires Chat app authentication with the chat.bot scope for this metadata endpoint.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.getAttachment)
  .authMethods(googleChatActionAuthMethods.getAttachment)
  .input(
    z.object({
      attachment: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Attachment ID or full spaces/{space}/messages/{message}/attachments/{attachment} resource name'
        ),
      message: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Message ID or resource name, required for a bare attachment ID'),
      space: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Space ID or resource name for a bare message ID; defaults to defaultSpace')
    })
  )
  .output(
    z.object({
      attachment: googleChatAttachmentMetadataOutputSchema.describe(
        'Attachment metadata returned by Google Chat'
      )
    })
  )
  .handleInvocation(async ctx => {
    let request = buildGetAttachmentRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatAttachmentMetadata>(request.attachmentName, {
      method: 'get',
      operation: 'get attachment metadata'
    });
    let attachment = mapGoogleChatAttachmentMetadata(response);

    return {
      output: { attachment },
      message: `Retrieved metadata for attachment \`${attachment.attachmentName}\`.`
    };
  })
  .build();
