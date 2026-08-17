import { searchUsers as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { decodeSlackCursor, encodeSlackCursor } from '../lib/cursors';
import { getSlackIdentity, mapSlackAuthor } from '../lib/mappers';

export let chatSearchUsers = contract
  .implement(spec)
  .scopes(slackActionScopes.userInfo)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let cursor = decodeSlackCursor(ctx.input.cursor, ctx.input.direction ?? 'forward');
    let [result, identity] = await Promise.all([
      client.listUsers({ limit: ctx.input.limit ?? 100, cursor: cursor.data.cursor }),
      getSlackIdentity(client)
    ]);
    let query = ctx.input.query.toLowerCase();
    let authors = result.members
      .filter(user =>
        [user.name, user.real_name, user.profile?.display_name, user.profile?.email]
          .filter(Boolean)
          .some(value => value!.toLowerCase().includes(query))
      )
      .map(user => mapSlackAuthor(user, identity));
    return {
      output: {
        authors,
        nextCursor: result.nextCursor
          ? encodeSlackCursor('forward', { cursor: result.nextCursor })
          : undefined,
        raw: result
      },
      message: `Found ${authors.length} Slack user(s).`
    };
  })
  .build();
