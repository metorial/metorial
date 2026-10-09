import { listMessages as contract, type PageDirection } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { loadChannelSafe, resolveDiscordIdentity, runDiscordChatAction } from '../lib/context';
import {
  decodeDiscordCursor,
  encodeDiscordCursor,
  snowflakeCursorSchema
} from '../lib/cursors';
import { compareSnowflakes, mapChannel, mapEventChannel, mapMessage } from '../lib/mappers';

/**
 * Discord pages by message id (`before`/`after`, max 100) and returns newest first; each
 * page is re-sorted oldest first. Backward pages continue before the oldest message,
 * forward pages after the newest.
 * https://docs.discord.com/developers/resources/message#get-channel-messages
 */
export let chatListMessages = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let output = await runDiscordChatAction(
      ctx,
      { action, notFound: 'chat.channel.not_found' },
      async client => {
        let channelId = ctx.input.threadId ?? ctx.input.channelId;
        let limit = ctx.input.limit ?? 50;
        let cursor = decodeDiscordCursor(
          ctx.input.cursor,
          ctx.input.direction ?? 'backward',
          snowflakeCursorSchema,
          action
        );

        let params =
          cursor.direction === 'forward'
            ? { limit, after: cursor.data?.id ?? '0' }
            : { limit, before: cursor.data?.id };

        let [identity, rawMessages, rawChannel] = await Promise.all([
          resolveDiscordIdentity(client, ctx.auth),
          client.listMessages(channelId, params),
          loadChannelSafe(client, channelId)
        ]);

        let sorted = [...rawMessages].sort((a, b) => compareSnowflakes(a.id, b.id));
        let oldest = sorted[0]?.id;
        let newest = sorted[sorted.length - 1]?.id;
        let full = rawMessages.length >= limit;

        let nextCursor =
          full && (cursor.direction === 'forward' ? newest : oldest)
            ? encodeDiscordCursor(cursor.direction, {
                id: (cursor.direction === 'forward' ? newest : oldest)!
              })
            : undefined;
        let reverse: PageDirection = cursor.direction === 'forward' ? 'backward' : 'forward';
        let prevAnchor = cursor.direction === 'forward' ? oldest : newest;
        let prevCursor =
          ctx.input.cursor && prevAnchor
            ? encodeDiscordCursor(reverse, { id: prevAnchor })
            : undefined;

        let guildId = rawChannel?.guild_id;
        return {
          messages: sorted.map(raw => mapMessage(raw, identity, { guildId })),
          nextCursor,
          prevCursor,
          channel: rawChannel
            ? mapChannel(rawChannel, identity)
            : mapEventChannel({ channelId }),
          raw: rawMessages
        };
      }
    );

    return { output, message: `Retrieved ${output.messages.length} Discord message(s).` };
  })
  .build();
