import { startTyping as contract } from '@slates/adapter-chat';
import { slackBotAuthMethods } from '../../lib/auth-methods';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';

export let chatStartTyping = contract
  .implement(spec)
  .scopes(slackActionScopes.chatTyping)
  .authMethods(slackBotAuthMethods)
  .handleInvocation(async ctx => {
    if (!ctx.input.threadId) throw new Error('Slack typing status requires a threadId');
    let client = new SlackClient(ctx.auth.token);
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
