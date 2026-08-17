import { deleteMessage as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';

export let chatDeleteMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    await client.deleteMessage({ channel: ctx.input.channelId, ts: ctx.input.messageId });
    return {
      output: { ok: true, raw: { channel: ctx.input.channelId, ts: ctx.input.messageId } },
      message: `Deleted Slack message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
