import { messageReceived as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type GoogleChatInteractionEvent,
  googleChatInteractionEvents
} from '../../triggers/interactionEvents';
import { isGoogleChatMessageEvent, mapGoogleChatEventMessage } from '../lib/event-mappers';
import { getGoogleChatAppIdentity } from '../lib/identity';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

/**
 * MESSAGE interaction events: direct messages to the app and space messages
 * that @mention it. Slash commands are delivered as chat.command.invoked only.
 */
export let chatMessageReceived = contract
  .implement(spec, googleChatInteractionEvents)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .matches(payload => isGoogleChatMessageEvent(payload))
  .map(async ctx => {
    let event = ctx.input as GoogleChatInteractionEvent;
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    let mapped = mapGoogleChatEventMessage(event, identity);
    let id = `${mapped.message.id}:received`;
    return {
      type: 'chat.message.received',
      id,
      output: {
        type: 'chat.message.received' as const,
        id,
        ...mapped,
        raw: event
      }
    };
  })
  .build();
