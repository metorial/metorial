import { ChatErrors, sendMessage as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  buildMessageResult,
  loadChannelSafe,
  resolveDiscordIdentity,
  runDiscordChatAction
} from '../lib/context';
import { clientReferencesFor, prepareAttachments } from '../lib/outgoing';
import { renderDiscordBody } from '../lib/render';

export let chatSendMessage = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let output = await runDiscordChatAction(ctx, { action }, async client => {
      if (ctx.input.ephemeral) {
        // Discord only supports ephemeral messages as interaction responses.
        throw ChatErrors.capabilityUnsupported({
          action,
          capability: 'message_ephemeral_native',
          message:
            'Discord bots can only send ephemeral messages as slash command responses; use the command response instead.'
        });
      }

      // Threads are channels on Discord, so a thread id is the target channel.
      let targetChannelId = ctx.input.threadId ?? ctx.input.channelId;
      let rendered = renderDiscordBody(ctx.input, action);
      let prepared = await prepareAttachments(ctx.input.attachments, { action });
      if (!rendered.content && rendered.embeds.length === 0 && prepared.files.length === 0) {
        throw ChatErrors.contentEmpty({ action });
      }

      let replyId = ctx.input.reply?.id ?? ctx.input.reply?.reference?.id;
      let identity = await resolveDiscordIdentity(client, ctx.auth);
      let raw = await client.createMessage(
        targetChannelId,
        {
          ...(rendered.content ? { content: rendered.content } : {}),
          ...(rendered.embeds.length > 0 ? { embeds: rendered.embeds } : {}),
          allowed_mentions: rendered.allowed_mentions,
          ...(replyId ? { message_reference: { message_id: replyId } } : {})
        },
        prepared.files
      );

      return buildMessageResult(
        raw,
        await loadChannelSafe(client, raw.channel_id),
        identity,
        clientReferencesFor(raw, prepared)
      );
    });

    return { output, message: `Sent Discord message \`${output.message.id}\`.` };
  })
  .build();
