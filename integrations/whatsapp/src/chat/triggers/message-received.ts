import { messageReceived as contract } from '@slates/adapter-chat';
import { getWhatsAppEventId } from '../../lib/eventId';
import { spec } from '../../spec';
import {
  isWhatsAppReceivedMessageType,
  type WhatsAppMessageEvent
} from '../../triggers/event-schemas';
import { whatsappWebhookTriggerGroup } from '../../triggers/webhook-trigger-group';
import { mapWhatsAppInboundMessage } from '../lib/mappers';

export let chatMessageReceived = contract
  .implement(spec, whatsappWebhookTriggerGroup)
  .matches(payload => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    let event = payload as { kind?: unknown; message?: { type?: unknown } | null };
    return event.kind === 'message' && isWhatsAppReceivedMessageType(event.message?.type);
  })
  .map(async ctx => {
    let event = ctx.input as WhatsAppMessageEvent;
    let { message, channel } = mapWhatsAppInboundMessage(event);
    let id = getWhatsAppEventId(event.message);

    return {
      type: 'chat.message.received',
      id,
      output: {
        type: 'chat.message.received' as const,
        id,
        message,
        channel,
        raw: event
      }
    };
  })
  .build();
