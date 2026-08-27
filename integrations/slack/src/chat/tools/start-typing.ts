import { ChatErrors, startTyping as contract } from '@slates/adapter-chat';
import { slackBotAuthMethods } from '../../lib/auth-methods';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';

export let chatStartTyping = contract
  .implement(spec)
  .scopes(slackActionScopes.chatTyping)
  .authMethods(slackBotAuthMethods)
  .handleInvocation(async ctx => {
    if (!ctx.input.threadId)
      throw ChatErrors.capabilityUnsupported({
        action: contract.key,
        capability: 'typing',
        message: 'Slack only supports typing status inside a thread, so threadId is required'
      });
    let client = createSlackChatClient(ctx, { action: contract.key });
    await client.setAssistantThreadStatus({
      channelId: ctx.input.channelId,
      threadTs: ctx.input.threadId,
      status: ctx.input.status ?? 'Typing…'
    });
    return {
      output: {
        ok: true,
        raw: { channelId: ctx.input.channelId, threadTs: ctx.input.threadId }
      },
      message: 'Set the Slack assistant thread status.'
    };
  })
  .build();
