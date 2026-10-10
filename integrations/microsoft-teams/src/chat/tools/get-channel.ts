import { ChatErrors, getChannel as contract } from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY } from '../../lib/botFramework';
import { spec } from '../../spec';
import { requireTeamsBotIdentity } from '../lib/client';
import { buildTeamsChannel, classifyConversation } from '../lib/ids';

// No "get conversation" API for Teams; the channel is derived from the id format.
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
    let raw = { conversationId: ctx.input.channelId, derivedFromId: true };
    let channel = buildTeamsChannel({
      conversationId: ctx.input.channelId,
      appId: identity.appId,
      raw
    });
    return {
      output: { channel, raw },
      message: `Resolved Teams conversation \`${channel.id}\`.`
    };
  })
  .build();
