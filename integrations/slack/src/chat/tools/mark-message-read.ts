import { markMessageRead as contract } from '@slates/adapter-chat';
import { slackUserAuthMethods } from '../../lib/auth-methods';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';

export let chatMarkMessageRead = contract
  .implement(spec)
  .scopes(slackActionScopes.markConversationRead)
  .authMethods(slackUserAuthMethods)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    await client.markConversationRead(ctx.input.channelId, ctx.input.messageId);
    return {
      output: { ok: true, raw: { channel: ctx.input.channelId, ts: ctx.input.messageId } },
      message: `Marked Slack conversation read through \`${ctx.input.messageId}\`.`
    };
  })
  .build();
