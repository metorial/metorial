import { attachmentTypeForMime, uploadFile as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

// Discord has no standalone upload; this returns a pending attachment for the next send.
export let chatUploadFile = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => ({
    output: {
      attachment: {
        type: attachmentTypeForMime(ctx.input.mimeType),
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
