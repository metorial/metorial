import { getAuthenticatedUser as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { mapSlackAuthor, mapSlackWorkspace } from '../lib/mappers';

export let chatGetAuthenticatedUser = contract
  .implement(spec)
  .scopes(slackActionScopes.userInfo)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let identity = await client.authTest();
    let actorType = ctx.auth.actorType ?? (identity.bot_id ? 'bot' : 'user');
    let actorUserId =
      identity.user_id ?? (actorType === 'bot' ? ctx.auth.botUserId : ctx.auth.userId);

    let [user, team] = await Promise.all([
      actorUserId ? client.getUserInfo(actorUserId).catch(() => undefined) : undefined,
      client.getTeamInfo().catch(() => undefined)
    ]);

    let author = {
      ...mapSlackAuthor(user, identity, {
        user: actorUserId,
        username: identity.user,
        bot_id: identity.bot_id
      }),
      isMe: true
    };

    return {
      output: {
        author,
        workspace: team ? mapSlackWorkspace(team) : undefined,
        raw: { identity, user, team }
      },
      message: `Connected as **${author.fullName}**${
        team?.name ? ` in **${team.name}**` : identity.team ? ` in **${identity.team}**` : ''
      }.`
    };
  })
  .build();
