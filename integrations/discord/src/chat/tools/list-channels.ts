import { ChatErrors, listChannels as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { resolveDiscordIdentity, runDiscordChatAction } from '../lib/context';
import { decodeDiscordCursor, encodeDiscordCursor, offsetCursorSchema } from '../lib/cursors';
import { mapChannel, NON_MESSAGE_CHANNEL_TYPES } from '../lib/mappers';
import type { DiscordApiChannel } from '../lib/types';

/**
 * Lists the message-capable channels of one server. Discord returns a server's channels
 * in one response, so pages are offsets into that list. Without `workspaceId` the bot's
 * only server is used; with several servers `workspaceId` is required.
 * https://docs.discord.com/developers/resources/guild#get-guild-channels
 */
export let chatListChannels = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let output = await runDiscordChatAction(
      ctx,
      { action, notFound: 'chat.workspace.not_found' },
      async client => {
        let cursor = decodeDiscordCursor(
          ctx.input.cursor,
          'forward',
          offsetCursorSchema,
          action
        );
        let workspaceId = ctx.input.workspaceId;
        if (!workspaceId) {
          let guilds = await client.listGuilds({ limit: 2 });
          if (guilds.length !== 1) {
            throw ChatErrors.missingTarget({
              action,
              message:
                guilds.length === 0
                  ? 'The bot is not in any Discord server.'
                  : 'The bot is in several Discord servers; pass workspaceId (the server id).'
            });
          }
          workspaceId = String(guilds[0].id);
        }

        let [identity, rawChannels] = await Promise.all([
          resolveDiscordIdentity(client, ctx.auth),
          client.getGuildChannels(workspaceId)
        ]);

        let query = ctx.input.query?.trim().toLowerCase();
        let channels = (rawChannels as DiscordApiChannel[])
          .filter(channel => !NON_MESSAGE_CHANNEL_TYPES.has(channel.type))
          .map(channel =>
            mapChannel({ ...channel, guild_id: channel.guild_id ?? workspaceId }, identity)
          )
          .filter(channel => !ctx.input.type || channel.type === ctx.input.type)
          .filter(channel => !query || (channel.name ?? '').toLowerCase().includes(query));

        let limit = ctx.input.limit ?? 100;
        let offset = cursor.data?.offset ?? 0;
        let page = channels.slice(offset, offset + limit);
        let nextOffset = offset + page.length;

        return {
          channels: page,
          nextCursor:
            nextOffset < channels.length
              ? encodeDiscordCursor('forward', { offset: nextOffset })
              : undefined,
          prevCursor:
            offset > 0
              ? encodeDiscordCursor('forward', { offset: Math.max(0, offset - limit) })
              : undefined,
          raw: { workspaceId, total: channels.length }
        };
      }
    );

    return { output, message: `Listed ${output.channels.length} Discord channel(s).` };
  })
  .build();
