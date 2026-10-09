import { commandInvoked as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import {
  type GoogleChatInteractionEvent,
  googleChatInteractionEvents
} from '../../triggers/interactionEvents';
import {
  isGoogleChatCommandEvent,
  mapGoogleChatEventAuthor,
  mapGoogleChatEventChannel,
  mapGoogleChatEventMessage
} from '../lib/event-mappers';
import { getGoogleChatAppIdentity } from '../lib/identity';
import type { GoogleChatMessageResource } from '../lib/mappers';
import { googleChatAppAuthMethods, googleChatAppScopes } from '../lib/scopes';

/**
 * Slash commands arrive as MESSAGE events with `message.slashCommand`; quick
 * commands and message actions arrive as APP_COMMAND events with
 * `appCommandMetadata` (https://developers.google.com/workspace/chat/commands).
 * Replies are sent asynchronously with chat.message.send.
 */
export let chatCommandInvoked = contract
  .implement(spec, googleChatInteractionEvents)
  .scopes(googleChatAppScopes)
  .authMethods(googleChatAppAuthMethods)
  .matches(payload => isGoogleChatCommandEvent(payload))
  .map(async ctx => {
    let event = ctx.input as GoogleChatInteractionEvent;
    let identity = getGoogleChatAppIdentity(ctx.auth, contract.key);
    let rawMessage = event.message as GoogleChatMessageResource | undefined;
    let annotation = rawMessage?.annotations?.find(
      entry => entry.type === 'SLASH_COMMAND'
    )?.slashCommand;
    let metadata = event.appCommandMetadata;

    let commandIdValue =
      rawMessage?.slashCommand?.commandId ?? annotation?.commandId ?? metadata?.appCommandId;
    let commandId = commandIdValue === undefined ? undefined : String(commandIdValue);
    let name =
      annotation?.commandName?.replace(/^\//, '').trim() ||
      (commandId ? `command-${commandId}` : 'command');
    let text = rawMessage?.argumentText?.trim() || undefined;

    let mapped = rawMessage?.name ? mapGoogleChatEventMessage(event, identity) : undefined;
    let channel = mapped?.channel ?? mapGoogleChatEventChannel(event, identity);
    let threadId =
      mapped?.message.threadId ?? (event.thread as { name?: string } | undefined)?.name;

    let id = rawMessage?.name
      ? `${rawMessage.name}:command`
      : `${event.space.name}:command:${commandId ?? 'unknown'}:${event.user?.name ?? 'unknown'}:${event.eventTime ?? ''}`;

    return {
      type: 'chat.command.invoked',
      id,
      output: {
        type: 'chat.command.invoked' as const,
        id,
        name,
        commandId,
        text,
        author: mapGoogleChatEventAuthor(event),
        channelId: event.space.name,
        threadId,
        message: mapped?.message,
        channel,
        thread: mapped?.thread,
        raw: event
      }
    };
  })
  .build();
