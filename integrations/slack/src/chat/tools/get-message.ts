import { getMessage as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { getSlackIdentity, hydrateSlackMessageResult } from '../lib/mappers';

export let chatGetMessage = contract
  .implement(spec)
  .scopes(slackActionScopes.conversationHistory)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let result = await client.getConversationHistory({
      channel: ctx.input.channelId,
      oldest: ctx.input.messageId,
      latest: ctx.input.messageId,
      inclusive: true,
      limit: 1
    });
    let message = result.messages.find(item => item.ts === ctx.input.messageId);
    if (!message) throw new Error(`Slack message ${ctx.input.messageId} was not found`);
    return {
      output: await hydrateSlackMessageResult(client, ctx.input.channelId, message, {
        identity: await getSlackIdentity(client)
      }),
      message: `Retrieved Slack message \`${ctx.input.messageId}\`.`
    };
  })
  .build();
