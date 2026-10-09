import { ChatErrors, respondToCommand as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { DiscordInteractionClient } from '../lib/client';
import {
  buildMessageResult,
  resolveDiscordIdentity,
  runDiscordChatAction
} from '../lib/context';
import {
  DISCORD_INTERACTION_TOKEN_TTL_MS,
  decodeDiscordResponseToken,
  EPHEMERAL_FLAG,
  InteractionCallbackType
} from '../lib/interaction';
import { clientReferencesFor, prepareAttachments } from '../lib/outgoing';
import { renderDiscordBody } from '../lib/render';
import type { DiscordApiMessage } from '../lib/types';

/**
 * Replies to a slash command. The gateway already deferred the interaction publicly, so
 * the reply edits that original response. Discord keeps the visibility chosen at
 * deferral (a follow-up right after a deferral edits the same message), so an ephemeral
 * reply is only possible when the interaction was not deferred.
 * https://docs.discord.com/developers/interactions/receiving-and-responding#edit-original-interaction-response
 */
export let chatRespondToCommand = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let output = await runDiscordChatAction(
      ctx,
      {
        action,
        notFound: 'chat.interaction.response_expired',
        ambiguous: { '50027': 'chat.interaction.response_expired' }
      },
      async client => {
        let token = decodeDiscordResponseToken(ctx.input.responseToken);
        if (!token) {
          throw ChatErrors.inputInvalid({
            action,
            message: 'responseToken is not a Discord command response handle.'
          });
        }
        if (Date.now() - token.receivedAt > DISCORD_INTERACTION_TOKEN_TTL_MS) {
          throw ChatErrors.responseExpired({
            action,
            message: 'Discord command responses must be sent within 15 minutes.'
          });
        }

        if (ctx.input.ephemeral === true && token.deferred && !token.ephemeral) {
          throw ChatErrors.capabilityUnsupported({
            action,
            capability: 'message_ephemeral_native',
            message:
              'This Discord command was acknowledged publicly, so its response cannot be made visible only to the invoking user.'
          });
        }

        let rendered = renderDiscordBody(ctx.input, action);
        let prepared = await prepareAttachments(ctx.input.attachments, { action });
        if (!rendered.content && rendered.embeds.length === 0 && prepared.files.length === 0) {
          throw ChatErrors.contentEmpty({ action });
        }

        let identity = await resolveDiscordIdentity(client, ctx.auth);
        let interaction = new DiscordInteractionClient(token.applicationId, token.token);
        let ephemeral = ctx.input.ephemeral === true;
        let payload = {
          content: rendered.content,
          embeds: rendered.embeds,
          allowed_mentions: rendered.allowed_mentions
        };

        let raw: DiscordApiMessage;
        if (!token.deferred) {
          await interaction.respond(
            token.interactionId,
            InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE,
            { ...payload, ...(ephemeral ? { flags: EPHEMERAL_FLAG } : {}) },
            prepared.files
          );
          raw = await interaction.getOriginal();
        } else {
          raw = await interaction.editOriginal(payload, prepared.files);
        }

        let result = buildMessageResult(
          raw,
          undefined,
          identity,
          clientReferencesFor(raw, prepared)
        );
        return { message: result.message, channel: result.channel, raw };
      }
    );

    return { output, message: 'Responded to the Discord command.' };
  })
  .build();
