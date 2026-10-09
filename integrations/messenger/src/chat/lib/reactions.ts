import { type Emoji, parseEmoji } from '@slates/adapter-chat';
import { isMessengerEventOfType, type MessengerEvent } from '../../triggers/event-schemas';
import { resolveMessengerEventParticipants } from './events';

/** Reaction labels Messenger sends when it reports a reaction without its emoji. */
let REACTION_LABEL_EMOJI: Record<string, string> = {
  smile: '😆',
  angry: '😠',
  sad: '😢',
  wow: '😮',
  love: '❤️',
  like: '👍',
  dislike: '👎'
};

export let mapMessengerReactionEmoji = (reaction: {
  emoji?: string;
  reaction?: string;
}): Emoji => {
  if (reaction.emoji) return parseEmoji(reaction.emoji);
  let label = reaction.reaction ?? 'other';
  let unicode = REACTION_LABEL_EMOJI[label];
  return unicode ? { type: 'unicode', value: unicode } : { type: 'custom', name: label };
};

export let mapMessengerReactionEvent = async (
  ctx: { auth: { token: string }; config?: { apiVersion?: string } },
  event: MessengerEvent,
  action: string
) => {
  let reaction = event.messaging.reaction!;
  let { author, channel } = await resolveMessengerEventParticipants(ctx, event, action);
  let id = [
    'reaction',
    reaction.mid,
    event.messaging.sender.id,
    reaction.action,
    reaction.emoji ?? reaction.reaction ?? '',
    event.messaging.timestamp
  ].join(':');
  return {
    id,
    messageId: reaction.mid,
    channelId: channel.id,
    emoji: mapMessengerReactionEmoji(reaction),
    author,
    channel,
    raw: event
  };
};

export let isMessengerReactionAction = (payload: unknown, action: 'react' | 'unreact') => {
  if (!isMessengerEventOfType(payload, 'reaction')) return false;
  let event = payload as { messaging: { reaction?: { action?: unknown } | null } };
  return event.messaging.reaction?.action === action;
};
