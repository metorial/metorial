import { listChannelMembers as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { decodeSlackCursor, encodeSlackCursor } from '../lib/cursors';
import { getSlackIdentity, mapSlackAuthor, mapSlackChannel } from '../lib/mappers';

export let chatListChannelMembers = contract
  .implement(spec)
  .scopes(slackActionScopes.conversationRead)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let cursor = decodeSlackCursor(ctx.input.cursor, ctx.input.direction ?? 'forward');
    let [result, identity, rawChannel] = await Promise.all([
      client.getConversationMembers(ctx.input.channelId, {
        limit: ctx.input.limit ?? 100,
        cursor: cursor.data.cursor
      }),
      getSlackIdentity(client),
      client.getConversationInfo(ctx.input.channelId).catch(() => undefined)
    ]);
    let authors = await Promise.all(
      result.members.map(async userId =>
        mapSlackAuthor(await client.getUserInfo(userId).catch(() => undefined), identity, {
          user: userId
        })
      )
    );
    return {
      output: {
        authors,
        channel: rawChannel ? mapSlackChannel(rawChannel, identity.team_id) : undefined,
        nextCursor: result.nextCursor
          ? encodeSlackCursor('forward', { cursor: result.nextCursor })
          : undefined,
        raw: result
      },
      message: `Retrieved ${authors.length} Slack member(s).`
    };
  })
  .build();
