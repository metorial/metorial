import { mentionReceived as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type GoogleChatInteractionEvent,
  googleChatInteractionEvents
} from '../../triggers/interactionEvents';
import { isGoogleChatMentionEvent, mapGoogleChatEventMessage } from '../lib/event-mappers';
import { getGoogleChatAppIdentity } from '../lib/identity';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

/**
 * MESSAGE events whose annotations include a USER_MENTION of a Chat app. Chat
 * only delivers space messages to an app when they mention it, so the bot user
 * mentioned there is this app. Direct messages without a mention fire only
 * chat.message.received.
 */
export let chatMentionReceived = contract
  .implement(spec, googleChatInteractionEvents)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .matches(payload => isGoogleChatMentionEvent(payload))
  .map(async ctx => {
    let event = ctx.input as GoogleChatInteractionEvent;
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    let mapped = mapGoogleChatEventMessage(event, identity);
    mapped.message.isMention = true;
    let id = `${mapped.message.id}:mention`;
    return {
      type: 'chat.mention.received',
      id,
      output: {
        type: 'chat.mention.received' as const,
        id,
        ...mapped,
        raw: event
      }
    };
  })
  .build();
