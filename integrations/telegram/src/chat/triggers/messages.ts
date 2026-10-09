import {
  commandInvoked,
  mentionReceived,
  messageReceived,
  messageUpdated
} from '@slates/adapter-chat';
import { spec } from '../../spec';
import { telegramUpdatesTriggerGroup } from '../../triggers/updates-trigger-group';
import {
  eventCommand,
  eventId,
  eventMentionsBot,
  peekEventMessage,
  readEventMessage,
  safely
} from '../lib/events';
import { mapTelegramMessage, mapTelegramSenderChat, mapTelegramUser } from '../lib/mappers';

// A bot command is delivered only as command.invoked, so a consumer answers it once.
export let chatMessageReceived = messageReceived
  .implement(spec, telegramUpdatesTriggerGroup)
  .matches(
    payload =>
      safely(() => !!peekEventMessage(payload, ['message', 'channel_post'])) &&
      !eventCommand(payload)
  )
  .map(async ctx => {
    let event = ctx.input;
    let mapped = mapTelegramMessage(readEventMessage(event, messageReceived.key), event.bot);
    let id = eventId(event);
    return {
      type: 'chat.message.received',
      id,
      output: { type: 'chat.message.received' as const, id, ...mapped, raw: event.update }
    };
  })
  .build();

export let chatMessageUpdated = messageUpdated
  .implement(spec, telegramUpdatesTriggerGroup)
  .matches(payload =>
    safely(() => !!peekEventMessage(payload, ['edited_message', 'edited_channel_post']))
  )
  .map(async ctx => {
    let event = ctx.input;
    let mapped = mapTelegramMessage(readEventMessage(event, messageUpdated.key), event.bot);
    let id = eventId(event);
    return {
      type: 'chat.message.updated',
      id,
      output: { type: 'chat.message.updated' as const, id, ...mapped, raw: event.update }
    };
  })
  .build();

export let chatMentionReceived = mentionReceived
  .implement(spec, telegramUpdatesTriggerGroup)
  .matches(payload => eventMentionsBot(payload) && !eventCommand(payload))
  .map(async ctx => {
    let event = ctx.input;
    let mapped = mapTelegramMessage(readEventMessage(event, mentionReceived.key), event.bot);
    let id = eventId(event, 'mention');
    return {
      type: 'chat.mention.received',
      id,
      output: { type: 'chat.mention.received' as const, id, ...mapped, raw: event.update }
    };
  })
  .build();

export let chatCommandInvoked = commandInvoked
  .implement(spec, telegramUpdatesTriggerGroup)
  .matches(payload => !!eventCommand(payload))
  .map(async ctx => {
    let event = ctx.input;
    let message = readEventMessage(event, commandInvoked.key);
    let command = eventCommand(event);
    let mapped = mapTelegramMessage(message, event.bot);
    let id = eventId(event, 'command');
    return {
      type: 'chat.command.invoked',
      id,
      output: {
        type: 'chat.command.invoked' as const,
        id,
        name: command?.name ?? '',
        text: command?.text,
        author: message.from
          ? mapTelegramUser(message.from, event.bot.id)
          : message.sender_chat
            ? mapTelegramSenderChat(message.sender_chat)
            : mapped.message.author,
        channelId: mapped.channel.id,
        threadId: mapped.thread?.id,
        message: mapped.message,
        channel: mapped.channel,
        thread: mapped.thread,
        raw: event.update
      }
    };
  })
  .build();
