import { ChatErrors } from '@slates/adapter-chat';
import {
  type TelegramEvent,
  type TelegramMessage,
  telegramChatMemberUpdatedSchema,
  telegramMessageReactionSchema,
  telegramMessageSchema
} from '../../triggers/event-schemas';
import {
  isTelegramBotMentioned,
  isTelegramContentMessage,
  parseTelegramCommand
} from './mappers';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export let peekEventMessage = (
  payload: unknown,
  kinds: readonly string[]
): { message: TelegramMessage; bot: { id: string; username?: string } } | undefined => {
  if (!isRecord(payload) || !isRecord(payload.update) || !isRecord(payload.bot))
    return undefined;
  if (typeof payload.kind !== 'string' || !kinds.includes(payload.kind)) return undefined;
  if (typeof payload.bot.id !== 'string') return undefined;
  let message = payload.update[payload.kind];
  if (!isRecord(message) || !isTelegramContentMessage(message)) return undefined;
  return {
    message: message as TelegramMessage,
    bot: {
      id: payload.bot.id,
      username: typeof payload.bot.username === 'string' ? payload.bot.username : undefined
    }
  };
};

export let safely = (check: () => boolean) => {
  try {
    return check();
  } catch {
    return false;
  }
};

export let eventMentionsBot = (payload: unknown) =>
  safely(() => {
    let peeked = peekEventMessage(payload, ['message', 'channel_post']);
    return !!peeked && isTelegramBotMentioned(peeked.message, peeked.bot);
  });

export let eventCommand = (payload: unknown) => {
  try {
    let peeked = peekEventMessage(payload, ['message']);
    return peeked ? parseTelegramCommand(peeked.message, peeked.bot) : undefined;
  } catch {
    return undefined;
  }
};

let incomplete = (action: string, cause: unknown) =>
  ChatErrors.eventIncomplete({
    action,
    message: 'The Telegram update is missing required fields.',
    cause
  });

export let readEventMessage = (event: TelegramEvent, action: string) => {
  let parsed = telegramMessageSchema.safeParse(event.update[event.kind]);
  if (!parsed.success) throw incomplete(action, parsed.error);
  return parsed.data;
};

export let readEventReaction = (event: TelegramEvent, action: string) => {
  let parsed = telegramMessageReactionSchema.safeParse(event.update.message_reaction);
  if (!parsed.success || !event.reaction) throw incomplete(action, parsed.error);
  return { update: parsed.data, change: event.reaction };
};

export let readEventMember = (event: TelegramEvent, action: string) => {
  let parsed = telegramChatMemberUpdatedSchema.safeParse(event.update[event.kind]);
  if (!parsed.success || !event.membership) throw incomplete(action, parsed.error);
  return parsed.data;
};

export let eventId = (event: TelegramEvent, suffix?: string) =>
  [event.bot.id, event.updateId, suffix].filter(part => part !== undefined).join(':');
