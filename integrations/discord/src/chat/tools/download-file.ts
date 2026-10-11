import { downloadFile as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';
import { parseDiscordFileReference, resolveDiscordAttachment } from '../lib/files';
import { mapAttachment } from '../lib/mappers';

export let chatDownloadFile = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let output = await runDiscordChatAction(
      ctx,
      { action, notFound: 'chat.attachment.not_found' },
      async client => {
        let reference = parseDiscordFileReference(ctx.input.providerFileReference, action);
        let resolved = await resolveDiscordAttachment(client, reference, action);
        await ctx.addAttachment({
          type: 'url',
          url: resolved.url,
          mimeType: resolved.attachment.content_type,
          refreshReference: reference,
          refreshAt: resolved.refreshAt
        });

        return {
          attachment: mapAttachment(resolved.attachment, {
            channelId: reference.channelId,
            messageId: reference.messageId
          }),
          raw: resolved.attachment
        };
      }
    );

    return {
      output,
      message: `Prepared Discord file \`${output.attachment.name ?? output.attachment.id}\` for download.`
    };
  })
  .build();
