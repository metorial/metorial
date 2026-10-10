import {
  ChatError,
  ChatErrors,
  downloadUrlRefreshAt,
  signedUrlHexExpiry
} from '@slates/adapter-chat';
import { z } from 'zod';
import type { MessengerChatClient, MessengerMessageAttachment } from './client';
import type { MessengerFileReference } from './mappers';

export let messengerFileReferenceSchema = z.object({
  messageId: z.string().min(1).optional(),
  attachmentId: z.string().min(1).optional(),
  index: z.number().int().nonnegative().optional(),
  url: z.string().min(1).optional(),
  type: z.string().optional()
});

let MESSENGER_FILE_HOST_SUFFIXES = ['.fbcdn.net', '.fbsbx.com', '.facebook.com'];
// CDN links without an `oe` expiry are reissued hourly.
let FALLBACK_TTL_MS = 60 * 60 * 1000;

export let isMessengerFileUrl = (value: string) => {
  try {
    let url = new URL(value);
    return (
      url.protocol === 'https:' &&
      MESSENGER_FILE_HOST_SUFFIXES.some(suffix => url.hostname.endsWith(suffix))
    );
  } catch {
    return false;
  }
};

let pickAttachment = (
  attachments: MessengerMessageAttachment[],
  reference: MessengerFileReference
) => {
  if (reference.attachmentId) {
    let match = attachments.find(attachment => attachment.id === reference.attachmentId);
    if (match) return match;
  }
  if (reference.index !== undefined) return attachments[reference.index];
  return attachments.length === 1 ? attachments[0] : undefined;
};

let attachmentUrl = (attachment: MessengerMessageAttachment | undefined) =>
  attachment?.file_url ?? attachment?.image_data?.url ?? attachment?.video_data?.url;

let assertMessengerFileUrl = (
  url: string,
  reference: MessengerFileReference,
  action: string
) => {
  if (!isMessengerFileUrl(url)) {
    throw ChatErrors.attachmentDownloadFailed({
      action,
      attachmentId: reference.attachmentId ?? reference.messageId,
      retryable: false,
      message: 'Messenger attachment downloads require an official HTTPS Meta CDN URL.'
    });
  }
};

let refreshAtFor = (url: string) =>
  downloadUrlRefreshAt(
    signedUrlHexExpiry(url, 'oe') ?? new Date(Date.now() + FALLBACK_TTL_MS)
  );

export interface ResolvedMessengerFile {
  url: string;
  attachment?: MessengerMessageAttachment;
  /** Present only when the URL can be reissued from the message. */
  refresh?: { reference: MessengerFileReference; refreshAt: string };
}

// https://developers.facebook.com/docs/graph-api/reference/message/attachments/
export let resolveMessengerFile = async (
  client: MessengerChatClient,
  reference: MessengerFileReference,
  action: string
): Promise<ResolvedMessengerFile> => {
  let attachment: MessengerMessageAttachment | undefined;
  let lookupError: unknown;
  if (reference.messageId) {
    try {
      attachment = pickAttachment(
        await client.getMessageAttachments(reference.messageId),
        reference
      );
    } catch (error) {
      // Only a missing message falls back to the webhook URL; other failures surface.
      if (!(ChatError.is(error) && error.chat.code.endsWith('.not_found'))) throw error;
      lookupError = error;
    }
  }

  let fresh = attachmentUrl(attachment);
  let url = fresh ?? reference.url;
  if (!url) {
    if (lookupError instanceof ChatError) throw lookupError;
    throw ChatErrors.attachmentNotFound({
      action,
      attachmentId: reference.attachmentId ?? reference.messageId,
      message: 'Messenger did not return a download URL for this attachment.'
    });
  }
  assertMessengerFileUrl(url, reference, action);

  if (!fresh || !reference.messageId) return { url, attachment };
  return {
    url,
    attachment,
    refresh: {
      reference: {
        messageId: reference.messageId,
        ...(attachment?.id || reference.attachmentId
          ? { attachmentId: attachment?.id ?? reference.attachmentId }
          : {}),
        ...(reference.index !== undefined ? { index: reference.index } : {}),
        ...(reference.type ? { type: reference.type } : {})
      },
      refreshAt: refreshAtFor(url)
    }
  };
};

/** Reissues a CDN URL from the message; the webhook URL is never reused here. */
export let reissueMessengerFileUrl = async (
  client: MessengerChatClient,
  reference: MessengerFileReference,
  action: string
) => {
  if (!reference.messageId) {
    throw ChatErrors.inputInvalid({
      action,
      message: 'The Messenger file reference needs a message id to reissue its URL.'
    });
  }
  let url = attachmentUrl(
    pickAttachment(await client.getMessageAttachments(reference.messageId), reference)
  );
  if (!url) {
    throw ChatErrors.attachmentNotFound({
      action,
      attachmentId: reference.attachmentId ?? reference.messageId,
      message: 'The attachment is no longer on that Messenger message.'
    });
  }
  assertMessengerFileUrl(url, reference, action);
  return { url, expiresAt: refreshAtFor(url) };
};
