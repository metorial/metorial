import { ChatError, ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { z } from 'zod';
import { spec } from '../../spec';
import { createMessengerChatClient, type MessengerMessageAttachment } from '../lib/client';

let referenceSchema = z.object({
  messageId: z.string().min(1).optional(),
  attachmentId: z.string().min(1).optional(),
  index: z.number().int().nonnegative().optional(),
  url: z.string().min(1).optional(),
  type: z.string().optional()
});

let MESSENGER_FILE_HOST_SUFFIXES = ['.fbcdn.net', '.fbsbx.com', '.facebook.com'];

let isMessengerFileUrl = (value: string) => {
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

let attachmentTypeFor = (
  type: string | undefined,
  mimeType: string | undefined
): 'image' | 'video' | 'audio' | 'file' => {
  let value = mimeType ?? '';
  if (type === 'image' || type === 'sticker' || value.startsWith('image/')) return 'image';
  if (type === 'video' || value.startsWith('video/')) return 'video';
  if (type === 'audio' || value.startsWith('audio/')) return 'audio';
  return 'file';
};

let pickAttachment = (
  attachments: MessengerMessageAttachment[],
  reference: z.infer<typeof referenceSchema>
) => {
  if (reference.attachmentId) {
    let match = attachments.find(attachment => attachment.id === reference.attachmentId);
    if (match) return match;
  }
  if (reference.index !== undefined) return attachments[reference.index];
  return attachments.length === 1 ? attachments[0] : undefined;
};

export let chatDownloadFile = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let parsed = referenceSchema.safeParse(ctx.input.providerFileReference);
    if (!parsed.success || (!parsed.data.messageId && !parsed.data.url)) {
      throw ChatErrors.inputInvalid({
        action,
        message: 'providerFileReference must include a Messenger message id or attachment URL.'
      });
    }
    let reference = parsed.data;
    let client = createMessengerChatClient(ctx, action);

    // Webhook CDN URLs expire, so a fresh one is resolved from the message when possible.
    let resolved: MessengerMessageAttachment | undefined;
    let lookupError: unknown;
    if (reference.messageId) {
      try {
        let attachments = await client.getMessageAttachments(reference.messageId);
        resolved = pickAttachment(attachments, reference);
      } catch (error) {
        // Only a missing message falls back to the webhook URL; other failures surface.
        if (!(ChatError.is(error) && error.chat.code.endsWith('.not_found'))) throw error;
        lookupError = error;
      }
    }

    let url =
      resolved?.file_url ??
      resolved?.image_data?.url ??
      resolved?.video_data?.url ??
      reference.url;

    if (!url) {
      if (lookupError instanceof ChatError) throw lookupError;
      throw ChatErrors.attachmentNotFound({
        action,
        attachmentId: reference.attachmentId ?? reference.messageId,
        message: 'Messenger did not return a download URL for this attachment.'
      });
    }

    if (!isMessengerFileUrl(url)) {
      throw ChatErrors.attachmentDownloadFailed({
        action,
        attachmentId: reference.attachmentId ?? reference.messageId,
        retryable: false,
        message: 'Messenger attachment downloads require an official HTTPS Meta CDN URL.'
      });
    }

    let mimeType = resolved?.mime_type;
    let attachment = {
      type: attachmentTypeFor(reference.type, mimeType),
      id: resolved?.id ?? reference.attachmentId,
      name: resolved?.name,
      mimeType,
      size: resolved?.size,
      width: resolved?.image_data?.width ?? resolved?.video_data?.width,
      height: resolved?.image_data?.height ?? resolved?.video_data?.height,
      status: 'complete' as const,
      providerFileReference: { ...reference, url },
      raw: resolved ?? { url }
    };

    // Meta CDN links are pre-signed; no Page credentials are forwarded with them.
    await ctx.addAttachment({ type: 'url', url, mimeType });

    return {
      output: { attachment, raw: resolved ?? { url } },
      message: attachment.name
        ? `Prepared **${attachment.name}** for download.`
        : 'Prepared the Messenger attachment for download.'
    };
  })
  .build();
