import {
  reactionAdded as addedContract,
  reactionRemoved as removedContract
} from '@slates/adapter-chat';
import { getWhatsAppEventId } from '../../lib/eventId';
import { spec } from '../../spec';
import type { WhatsAppMessageEvent } from '../../triggers/event-schemas';
import { whatsappWebhookTriggerGroup } from '../../triggers/webhook-trigger-group';
import {
  getWhatsAppSenderChannelId,
  mapWhatsAppChannel,
  mapWhatsAppCustomerAuthor
} from '../lib/mappers';

// https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/reaction
let getReaction = (payload: unknown) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  let event = payload as { kind?: unknown; message?: Record<string, unknown> | null };
  if (event.kind !== 'message' || event.message?.type !== 'reaction') return undefined;
  let reaction = event.message.reaction;
  if (!reaction || typeof reaction !== 'object') return undefined;
  let { message_id: messageId, emoji } = reaction as { message_id?: unknown; emoji?: unknown };
  if (typeof messageId !== 'string' || !messageId) return undefined;
  return { messageId, emoji: typeof emoji === 'string' ? emoji : '' };
};

let mapReaction = (event: WhatsAppMessageEvent) => {
  let reaction = getReaction(event)!;
  let channelId = getWhatsAppSenderChannelId(event) ?? '';
  return {
    id: getWhatsAppEventId(event.message),
    messageId: reaction.messageId,
    channelId,
    emoji: reaction.emoji,
    author: mapWhatsAppCustomerAuthor(channelId, event.contact),
    channel: mapWhatsAppChannel({
      channelId,
      workspaceId: event.phoneNumberId,
      contact: event.contact,
      includeRecipient: true
    })
  };
};

export let chatReactionAdded = addedContract
  .implement(spec, whatsappWebhookTriggerGroup)
  .matches(payload => {
    let reaction = getReaction(payload);
    return !!reaction && reaction.emoji.length > 0;
  })
  .map(async ctx => {
    let event = ctx.input as WhatsAppMessageEvent;
    let { id, emoji, ...rest } = mapReaction(event);

    return {
      type: 'chat.reaction.added',
      id,
      output: {
        type: 'chat.reaction.added' as const,
        id,
        ...rest,
        emoji: { type: 'unicode' as const, value: emoji },
        raw: event
      }
    };
  })
  .build();

// Removals omit `emoji`, so the normalized emoji is empty; see raw.
export let chatReactionRemoved = removedContract
  .implement(spec, whatsappWebhookTriggerGroup)
  .matches(payload => {
    let reaction = getReaction(payload);
    return !!reaction && reaction.emoji.length === 0;
  })
  .map(async ctx => {
    let event = ctx.input as WhatsAppMessageEvent;
    let { id, emoji: _emoji, ...rest } = mapReaction(event);

    return {
      type: 'chat.reaction.removed',
      id,
      output: {
        type: 'chat.reaction.removed' as const,
        id,
        ...rest,
        emoji: { type: 'unicode' as const, value: '' },
        raw: event
      }
    };
  })
  .build();
