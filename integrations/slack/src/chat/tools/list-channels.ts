import { listChannels as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { decodeSlackCursor, encodeSlackCursor } from '../lib/cursors';
import { getSlackIdentity, mapSlackChannel } from '../lib/mappers';

let channelTypes = (type?: string) => {
  if (type === 'public' || type === 'shared' || type === 'announcement' || type === 'forum')
    return 'public_channel';
  if (type === 'private') return 'private_channel';
  if (type === 'dm') return 'im';
  if (type === 'group_dm') return 'mpim';
  return 'public_channel,private_channel,im,mpim';
};

export let chatListChannels = contract
  .implement(spec)
  .scopes(slackActionScopes.conversationRead)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let cursor = decodeSlackCursor(ctx.input.cursor, ctx.input.direction ?? 'forward');
    let [result, identity] = await Promise.all([
      client.listConversations({
        types: channelTypes(ctx.input.type),
        excludeArchived: true,
        limit: ctx.input.limit ?? 100,
        cursor: cursor.data.cursor
      }),
      getSlackIdentity(client)
    ]);
    let channels = result.channels
      .map(channel => mapSlackChannel(channel, identity.team_id))
      .filter(
        channel => !ctx.input.workspaceId || channel.workspaceId === ctx.input.workspaceId
      )
      .filter(
        channel =>
          !ctx.input.query ||
          channel.name?.toLowerCase().includes(ctx.input.query.toLowerCase())
      );
    return {
      output: {
        channels,
        nextCursor: result.nextCursor
          ? encodeSlackCursor('forward', { cursor: result.nextCursor })
          : undefined,
        raw: result
      },
      message: `Retrieved ${channels.length} Slack conversation(s).`
    };
  })
  .build();
