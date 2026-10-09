import type { Channel, Message } from '@slates/adapter-chat';
import {
  getZoomBotNotificationKey,
  type ZoomChatbotEvent
} from '../../triggers/chatbotTriggerGroup';
import { epochToIso, mapZoomChannel, mapZoomUserAuthor, normalizeJid } from './mappers';

/**
 * `bot_notification` carries no Zoom message ID, so inbound messages get a
 * synthetic, stable ID with this prefix. It is not a valid `reply_to` target.
 * Payload reference: https://developers.zoom.us/docs/chat/capabilities/#slash-commands
 */
export let ZOOM_NOTIFICATION_MESSAGE_PREFIX = 'bot_notification:';

export let isZoomNotificationMessageId = (id: string | undefined) =>
  typeof id === 'string' && id.startsWith(ZOOM_NOTIFICATION_MESSAGE_PREFIX);

let str = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

export let isZoomBotNotification = (event: unknown): event is ZoomChatbotEvent => {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return false;
  let candidate = event as { event?: unknown; payload?: unknown };
  if (candidate.event !== 'bot_notification') return false;
  let payload = candidate.payload as Record<string, unknown> | undefined;
  return (
    !!payload &&
    typeof payload === 'object' &&
    !!str(payload.toJid) &&
    !!str(payload.userJid) &&
    !!str(payload.robotJid) &&
    !!str(payload.accountId)
  );
};

/**
 * Outside a direct chat with the bot, Zoom only notifies the chatbot through its slash
 * command, so a channel notification is a command invocation and a direct one is a message.
 * https://developers.zoom.us/docs/chat/capabilities/#slash-commands
 */
export let isZoomSlashCommandNotification = (event: unknown): event is ZoomChatbotEvent =>
  isZoomBotNotification(event) &&
  normalizeJid(String(event.payload.toJid)) !== normalizeJid(String(event.payload.userJid));

export interface MappedZoomNotification {
  key: string;
  message: Message;
  channel: Channel;
}

export let mapZoomBotNotification = (event: ZoomChatbotEvent): MappedZoomNotification => {
  let payload = event.payload;
  let toJid = String(payload.toJid);
  let userJid = String(payload.userJid);
  let accountId = String(payload.accountId);
  let robotJid = String(payload.robotJid);
  let key = getZoomBotNotificationKey(payload, event.event_ts);

  let author = mapZoomUserAuthor({
    userJid,
    userName: str(payload.userName),
    userId: str(payload.userId),
    userMemberId: str(payload.userMemberId),
    userStatus: str(payload.userStatus),
    botJid: robotJid
  });

  let isDirect = normalizeJid(toJid) === normalizeJid(userJid);
  let channel = mapZoomChannel(toJid, accountId, {
    name: str(payload.channelName),
    recipient: isDirect ? author : undefined
  });

  // Zoom documents `timestamp` on every bot_notification; fall back to receipt time.
  let sentAt =
    epochToIso(payload.timestamp) ?? epochToIso(event.event_ts) ?? new Date().toISOString();

  let message: Message = {
    id: `${ZOOM_NOTIFICATION_MESSAGE_PREFIX}${key}`,
    channelId: toJid,
    author,
    body: {
      parts: [{ type: 'text', content: typeof payload.cmd === 'string' ? payload.cmd : '' }]
    },
    providerType: 'bot_notification',
    metadata: { sentAt, edited: false },
    raw: event
  };

  return { key, message, channel };
};
