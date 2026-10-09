import { type AttachmentRef, uploadFile as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

let attachmentType = (mimeType: string | undefined): AttachmentRef['type'] => {
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  return 'file';
};

/**
 * Discord has no standalone upload: files are sent with the message that carries them.
 * This returns a pending attachment for the next message send, without contacting
 * Discord or storing anything.
 */
export let chatUploadFile = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => ({
    output: {
      attachment: {
        type: attachmentType(ctx.input.mimeType),
        name: ctx.input.filename,
        mimeType: ctx.input.mimeType,
        size: ctx.input.fileSize,
        status: 'pending' as const,
        sourceUrl: ctx.input.fileUrl,
        clientReferenceId: ctx.input.clientReferenceId
      }
    },
    message: `Prepared \`${ctx.input.filename}\` to be attached to the next message.`
  }))
  .build();
