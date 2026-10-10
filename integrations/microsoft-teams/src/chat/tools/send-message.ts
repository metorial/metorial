import { ChatErrors, sendMessage as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { createTeamsBotClient } from '../lib/client';
import {
  buildTeamsChannel,
  classifyConversation,
  parseConversationId,
  threadConversationId
} from '../lib/ids';
import { mapSentMessage } from '../lib/mappers';
import { renderTeamsMarkdown } from '../lib/render';

// https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference?view=azure-bot-service-4.0#send-to-conversation
export let chatSendMessage = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let input = ctx.input;

    if (input.ephemeral) {
      throw ChatErrors.capabilityUnsupported({
        action,
        capability: 'message_send_ephemeral',
        message: 'Microsoft Teams bots cannot send messages visible to only one user.'
      });
    }

    let client = createTeamsBotClient(ctx.auth, action, { channelId: input.channelId });
    let text = renderTeamsMarkdown(input, action);
    let { baseId, threadRootId } = parseConversationId(input.channelId);
    let kind = classifyConversation(input.channelId);
    let isChannel = kind?.providerType === 'channel';

    let threadId = input.threadId ?? input.reply?.reference?.threadId ?? threadRootId;
    let replyToId = input.reply?.id ?? input.reply?.reference?.id;

    let activity = { type: 'message' as const, text, textFormat: 'markdown' as const };
    let response: { id?: string };
    let sentThreadId: string | undefined;

    if (isChannel) {
      // Channel replies are posts in the root message's thread conversation.
      let rootId = threadId ?? replyToId;
      sentThreadId = rootId;
      response = await client.sendToConversation(
        threadConversationId(baseId, rootId),
        activity
      );
    } else {
      if (input.threadId) {
        throw ChatErrors.inputInvalid({
          action,
          message: 'Threads exist only in Teams channels; omit threadId for chats.',
          issues: [
            {
              path: ['threadId'],
              code: 'invalid',
              message: 'Teams chats do not have threads'
            }
          ]
        });
      }
      response = replyToId
        ? await client.replyToActivity(baseId, replyToId, { ...activity, replyToId })
        : await client.sendToConversation(baseId, activity);
    }

    if (!response?.id) {
      throw ChatErrors.providerError({
        action,
        message: 'Teams accepted the message but did not return its id.'
      });
    }

    let identity = client.identity;
    let channel = buildTeamsChannel({ conversationId: baseId, appId: identity.appId });
    let message = mapSentMessage({
      id: response.id,
      channelId: channel.id,
      threadId: sentThreadId,
      body: input,
      appId: identity.appId,
      botName: identity.botName,
      sentAt: new Date().toISOString(),
      raw: response
    });

    return {
      output: {
        message,
        channel,
        ...(sentThreadId
          ? {
              thread: {
                id: sentThreadId,
                channelId: channel.id,
                type: 'conversation' as const,
                providerType: 'channel_thread',
                rootMessageId: sentThreadId,
                raw: { conversationId: threadConversationId(baseId, sentThreadId) }
              }
            }
          : {}),
        raw: response
      },
      message: `Sent Teams message \`${response.id}\`.`
    };
  })
  .build();
