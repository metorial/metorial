import { ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { createMessengerChatClient } from '../lib/client';
import { messengerFileReferenceSchema, resolveMessengerFile } from '../lib/files';

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

export let chatDownloadFile = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let parsed = messengerFileReferenceSchema.safeParse(ctx.input.providerFileReference);
    if (!parsed.success || (!parsed.data.messageId && !parsed.data.url)) {
      throw ChatErrors.inputInvalid({
        action,
        message: 'providerFileReference must include a Messenger message id or attachment URL.'
      });
    }
    let reference = parsed.data;
    let client = createMessengerChatClient(ctx, action);

    // Webhook CDN URLs expire, so a fresh one is resolved from the message when possible.
    let {
      url,
      attachment: resolved,
      refresh
    } = await resolveMessengerFile(client, reference, action);

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
    await ctx.addAttachment({
      type: 'url',
      url,
      mimeType,
      ...(refresh ? { refreshReference: refresh.reference, refreshAt: refresh.refreshAt } : {})
    });

    return {
      output: { attachment, raw: resolved ?? { url } },
      message: attachment.name
        ? `Prepared **${attachment.name}** for download.`
        : 'Prepared the Messenger attachment for download.'
    };
  })
  .build();
