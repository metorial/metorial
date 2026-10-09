import { ChatErrors, getChannel as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { requireTeamsBotIdentity } from '../lib/client';
import { buildTeamsChannel, classifyConversation } from '../lib/ids';

/**
 * Documented fallback: the Bot Connector has no "get conversation" operation
 * for Teams, so the channel is derived from the conversation id format
 * (personal `a:`, group chat `@thread.v2`, channel `@thread.tacv2`). Names,
 * topics, and channel visibility are not fabricated.
 * https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference?view=azure-bot-service-4.0#conversation-operations
 */
export let chatGetChannel = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let identity = requireTeamsBotIdentity(ctx.auth, action);
    if (!classifyConversation(ctx.input.channelId)) {
      throw ChatErrors.channelNotFound({
        action,
        channelId: ctx.input.channelId,
        message: 'The id is not a Microsoft Teams conversation id.'
      });
    }
    let channel = buildTeamsChannel({
      conversationId: ctx.input.channelId,
      appId: identity.appId,
      raw: { conversationId: ctx.input.channelId, derivedFromId: true }
    });
    return {
      output: { channel, raw: { conversationId: ctx.input.channelId, derivedFromId: true } },
      message: `Resolved Teams conversation \`${channel.id}\`.`
    };
  })
  .build();
