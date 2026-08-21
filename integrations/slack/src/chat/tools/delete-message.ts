import { deleteMessage as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';

export let chatDeleteMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.chatWrite)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    await client.deleteMessage({ channel: ctx.input.channelId, ts: ctx.input.messageId });
    return {
      output: { ok: true, raw: { channel: ctx.input.channelId, ts: ctx.input.messageId } },
      message: `Deleted Slack message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
