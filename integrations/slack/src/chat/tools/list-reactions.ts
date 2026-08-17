import { listReactions as contract, parseEmoji } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getSlackIdentity, mapSlackAuthor } from '../lib/mappers';

export let chatListReactions = contract
  .implement(spec)
  .scopes(slackActionScopes.reactionsRead)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let message = await client.getReactions({
      channel: ctx.input.channelId,
      timestamp: ctx.input.messageId
    });
    let identity = await getSlackIdentity(client);
    let reactions = await Promise.all(
      (message.reactions ?? []).map(async reaction => ({
        emoji: parseEmoji(`:${reaction.name}:`),
        count: reaction.count,
        authors: await Promise.all(
          reaction.users.map(async userId =>
            mapSlackAuthor(await client.getUserInfo(userId).catch(() => undefined), identity, {
              user: userId
            })
          )
        )
      }))
    );
    return {
      output: { reactions, raw: message },
      message: `Found ${reactions.length} reaction type(s).`
    };
  })
  .build();
