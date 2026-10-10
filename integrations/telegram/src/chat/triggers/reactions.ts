import { ChatErrors, reactionAdded, reactionRemoved } from '@slates/adapter-chat';
import { spec } from '../../spec';
import type { TelegramEvent } from '../../triggers/event-schemas';
import { telegramUpdatesTriggerGroup } from '../../triggers/updates-trigger-group';
import { eventId, readEventReaction } from '../lib/events';
import {
  mapTelegramChat,
  mapTelegramReactionEmoji,
  mapTelegramSenderChat,
  mapTelegramUser
} from '../lib/mappers';

let isReaction = (payload: unknown, change: 'added' | 'removed') => {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return false;
  let event = payload as { kind?: unknown; reaction?: { change?: unknown } };
  return event.kind === 'message_reaction' && event.reaction?.change === change;
};

let mapReaction = (event: TelegramEvent, action: string) => {
  let { update, change } = readEventReaction(event, action);
  let emoji = mapTelegramReactionEmoji(change.type);
  if (!emoji) {
    throw ChatErrors.eventUnrecognized({
      action,
      message: 'Paid reactions are not reported.'
    });
  }
  let channel = mapTelegramChat(update.chat, event.bot.id);
  let author = update.user
    ? mapTelegramUser(update.user, event.bot.id)
    : update.actor_chat
      ? mapTelegramSenderChat(update.actor_chat)
      : mapTelegramSenderChat(update.chat);
  let emojiKey = emoji.type === 'unicode' ? emoji.value : `custom:${emoji.id}`;
  return {
    id: eventId(event, `reaction:${change.change}:${emojiKey}`),
    fields: {
      messageId: String(update.message_id),
      channelId: channel.id,
      emoji,
      author,
      channel,
      raw: event.update
    }
  };
};

export let chatReactionAdded = reactionAdded
  .implement(spec, telegramUpdatesTriggerGroup)
  .matches(payload => isReaction(payload, 'added'))
  .map(async ctx => {
    let { id, fields } = mapReaction(ctx.input, reactionAdded.key);
    return {
      type: 'chat.reaction.added',
      id,
      output: { type: 'chat.reaction.added' as const, id, ...fields }
    };
  })
  .build();

export let chatReactionRemoved = reactionRemoved
  .implement(spec, telegramUpdatesTriggerGroup)
  .matches(payload => isReaction(payload, 'removed'))
  .map(async ctx => {
    let { id, fields } = mapReaction(ctx.input, reactionRemoved.key);
    return {
      type: 'chat.reaction.removed',
      id,
      output: { type: 'chat.reaction.removed' as const, id, ...fields }
    };
  })
  .build();
