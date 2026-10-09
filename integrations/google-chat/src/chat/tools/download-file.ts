import { ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { z } from 'zod';
import { GOOGLE_CHAT_API_BASE_URL } from '../../lib/client';
import { resolveGoogleChatAttachmentName } from '../../lib/resource-names';
import { spec } from '../../spec';
import { resolveGoogleChatAttachmentDataName } from '../../tools/download-attachment';
import { createGoogleChatAppClient } from '../lib/client';
import { type GoogleChatAttachmentResource, mapGoogleChatAttachment } from '../lib/mappers';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

let providerFileReferenceSchema = z.object({
  attachmentName: z.string().optional(),
  resourceName: z.string().optional(),
  driveFileId: z.string().optional(),
  contentName: z.string().optional(),
  contentType: z.string().optional()
});

let invalidReference = (message: string, cause?: unknown) =>
  ChatErrors.inputInvalid({ action: contract.key, message, cause });

/**
 * Downloads Google Chat-hosted attachment bytes from media.download
 * (`GET /v1/media/{resourceName}?alt=media`, chat.bot accepted). When only the
 * attachment resource name is known, spaces.messages.attachments.get (Chat app
 * authentication) resolves its attachmentDataRef first. Google Drive
 * attachments are not Chat-hosted and are reported as unsupported.
 */
export let chatDownloadFile = contract
  .implement(spec)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .handleInvocation(async ctx => {
    let parsed = providerFileReferenceSchema.safeParse(ctx.input.providerFileReference);
    if (!parsed.success || (!parsed.data.resourceName && !parsed.data.attachmentName)) {
      if (parsed.success && parsed.data.driveFileId) {
        throw ChatErrors.attachmentUnsupportedType({
          action: contract.key,
          attachmentId: parsed.data.driveFileId,
          message: 'Google Drive attachments must be downloaded through Google Drive.',
          retryable: false
        });
      }
      throw invalidReference(
        'providerFileReference must include a Google Chat attachment name or attachment data resource name.'
      );
    }

    let reference = parsed.data;
    let client = createGoogleChatAppClient(ctx, {
      action: contract.key,
      attachmentId: reference.attachmentName ?? reference.resourceName,
      ambiguous: { NOT_FOUND: 'chat.attachment.not_found' }
    });

    let metadata: GoogleChatAttachmentResource | undefined;
    if (reference.attachmentName) {
      let attachmentName: string;
      try {
        attachmentName = resolveGoogleChatAttachmentName(reference.attachmentName);
      } catch (error) {
        throw invalidReference('attachmentName is not a Google Chat attachment name.', error);
      }
      metadata = await client.request<GoogleChatAttachmentResource>(attachmentName, {
        method: 'get'
      });
    }

    if (metadata?.driveDataRef?.driveFileId && !metadata.attachmentDataRef?.resourceName) {
      throw ChatErrors.attachmentUnsupportedType({
        action: contract.key,
        attachmentId: metadata.name,
        message: 'Google Drive attachments must be downloaded through Google Drive.',
        retryable: false
      });
    }

    let rawResourceName = metadata?.attachmentDataRef?.resourceName ?? reference.resourceName;
    if (!rawResourceName) {
      throw ChatErrors.attachmentNotFound({
        action: contract.key,
        attachmentId: reference.attachmentName,
        message: 'The attachment has no Google Chat-hosted content to download.'
      });
    }

    let resourceName: string;
    try {
      resourceName = resolveGoogleChatAttachmentDataName(rawResourceName);
    } catch (error) {
      throw invalidReference(
        'resourceName is not a safe Google Chat attachment data name.',
        error
      );
    }

    let mimeType = metadata?.contentType ?? reference.contentType;
    let attachment = metadata
      ? mapGoogleChatAttachment(metadata)
      : mapGoogleChatAttachment({
          name: reference.attachmentName,
          contentName: reference.contentName,
          contentType: reference.contentType,
          attachmentDataRef: { resourceName }
        });

    await ctx.addAttachment({
      type: 'url',
      url: `${GOOGLE_CHAT_API_BASE_URL}media/${resourceName}`,
      query: { alt: 'media' },
      mimeType,
      filename: attachment.name,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });

    return {
      output: { attachment, raw: metadata ?? reference },
      message: `Prepared ${attachment.name ? `**${attachment.name}**` : 'the Google Chat attachment'} for download.`
    };
  })
  .build();
