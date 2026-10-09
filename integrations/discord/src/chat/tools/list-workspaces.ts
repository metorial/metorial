import { listWorkspaces as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { runDiscordChatAction } from '../lib/context';
import {
  decodeDiscordCursor,
  encodeDiscordCursor,
  snowflakeCursorSchema
} from '../lib/cursors';
import { mapWorkspace } from '../lib/mappers';

/**
 * Discord servers (guilds) the bot belongs to, paged by guild id.
 * https://docs.discord.com/developers/resources/user#get-current-user-guilds
 */
export let chatListWorkspaces = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let output = await runDiscordChatAction(ctx, { action }, async client => {
      let cursor = decodeDiscordCursor(
        ctx.input.cursor,
        'forward',
        snowflakeCursorSchema,
        action
      );
      let limit = ctx.input.limit ?? 100;
      let guilds = await client.listGuilds({ limit, after: cursor.data?.id });
      let query = ctx.input.query?.trim().toLowerCase();
      let last = guilds[guilds.length - 1]?.id;

      return {
        workspaces: guilds
          .filter(
            guild =>
              !query ||
              String(guild.name ?? '')
                .toLowerCase()
                .includes(query)
          )
          .map(mapWorkspace),
        nextCursor:
          guilds.length >= limit && last
            ? encodeDiscordCursor('forward', { id: String(last) })
            : undefined,
        raw: guilds
      };
    });

    return { output, message: `Listed ${output.workspaces.length} Discord server(s).` };
  })
  .build();
