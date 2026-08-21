import { ChatErrors, getMessage as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { getSlackIdentity, hydrateSlackMessageResult } from '../lib/mappers';

export let chatGetMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.conversationHistory)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, { action: contract.key });
    let result = await client.getConversationHistory({
      channel: ctx.input.channelId,
      oldest: ctx.input.messageId,
      latest: ctx.input.messageId,
      inclusive: true,
      limit: 1
    });
    let message = result.messages.find(item => item.ts === ctx.input.messageId);
    if (!message)
      throw ChatErrors.messageNotFound({
        action: contract.key,
        messageId: ctx.input.messageId
      });
    return {
      output: await hydrateSlackMessageResult(client, ctx.input.channelId, message, {
        identity: await getSlackIdentity(client)
      }),
      message: `Retrieved Slack message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
