/**
 * Stable per-event identity for inbound WhatsApp messages, used both as the
 * webhook idempotency key and as the normalized trigger event id.
 *
 * Ordinary inbound messages use the provider message id (`wamid`). Reaction
 * deliveries add the emoji and timestamp: Meta's documented add/remove reaction
 * samples reuse the same `wamid`, so the message id alone could drop a removal
 * as a duplicate of the earlier add.
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/reaction
 */
export let getWhatsAppEventId = (message: {
  id: string;
  type?: string | null;
  timestamp?: string | null;
  reaction?: unknown;
}) => {
  if (message.type !== 'reaction') return message.id;

  let reaction = (message.reaction ?? {}) as { emoji?: unknown };
  let emoji =
    typeof reaction.emoji === 'string' && reaction.emoji ? reaction.emoji : 'removed';
  return `${message.id}:reaction:${emoji}:${message.timestamp ?? ''}`;
};
