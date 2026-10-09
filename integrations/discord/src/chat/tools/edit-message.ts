import { ChatErrors, editMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  buildMessageResult,
  loadChannelSafe,
  resolveDiscordIdentity,
  runDiscordChatAction
} from '../lib/context';
import { clientReferencesFor, prepareAttachments } from '../lib/outgoing';
import { renderDiscordBody } from '../lib/render';

export let chatEditMessage = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let output = await runDiscordChatAction(
      ctx,
      { action, notFound: 'chat.message.not_found' },
      async client => {
        let rendered = renderDiscordBody(ctx.input, action);
        let prepared = await prepareAttachments(ctx.input.attachments, {
          action,
          messageId: ctx.input.messageId
        });
        // Omitting `attachments` keeps the message's files; sending it replaces the set.
        let keep = ctx.input.attachments === undefined ? undefined : prepared.kept;
        if (
          !rendered.content &&
          rendered.embeds.length === 0 &&
          prepared.files.length === 0 &&
          keep?.length === 0
        ) {
          throw ChatErrors.contentEmpty({ action });
        }

        let identity = await resolveDiscordIdentity(client, ctx.auth);
        let raw = await client.editMessage(
          ctx.input.channelId,
          ctx.input.messageId,
          {
            content: rendered.content,
            embeds: rendered.embeds,
            allowed_mentions: rendered.allowed_mentions
          },
          prepared.files,
          keep
        );

        return buildMessageResult(
          raw,
          await loadChannelSafe(client, raw.channel_id),
          identity,
          clientReferencesFor(raw, prepared)
        );
      }
    );

    return { output, message: `Edited Discord message \`${output.message.id}\`.` };
  })
  .build();
