import { ChatErrors, startTyping as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { createTeamsBotClient } from '../lib/client';
import { classifyConversation, parseConversationId, threadConversationId } from '../lib/ids';

// A `typing` activity sent to the conversation:
// https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference?view=azure-bot-service-4.0#activity-object
export let chatStartTyping = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let client = createTeamsBotClient(ctx.auth, action, { channelId: ctx.input.channelId });
    let { baseId, threadRootId } = parseConversationId(ctx.input.channelId);
    let threadId = ctx.input.threadId ?? threadRootId;
    let isChannel = classifyConversation(ctx.input.channelId)?.providerType === 'channel';

    if (threadId && !isChannel) {
      throw ChatErrors.inputInvalid({
        action,
        message: 'Threads exist only in Teams channels; omit threadId for chats.'
      });
    }

    let conversationId = isChannel ? threadConversationId(baseId, threadId) : baseId;
    let response = await client.sendToConversation(conversationId, { type: 'typing' });
    return {
      output: { ok: true, raw: response ?? null },
      message: 'Sent a Teams typing indicator.'
    };
  })
  .build();
