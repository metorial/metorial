import { z } from 'zod';
import { messengerServiceError } from './errors';

// https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages
// Meta rejects these tags with error 100 since April 27, 2026. They stay in the enum so
// existing calls validate, and are refused here with a clear explanation.
let RETIRED_MESSAGE_TAGS = new Set([
  'CONFIRMED_EVENT_UPDATE',
  'POST_PURCHASE_UPDATE',
  'ACCOUNT_UPDATE'
]);

export let messagingTypeSchema = z
  .enum(['RESPONSE', 'UPDATE', 'MESSAGE_TAG'])
  .default('RESPONSE')
  .describe(
    'The messaging type: RESPONSE (reply to a message from the person), UPDATE (proactive message inside the standard messaging window), or MESSAGE_TAG (outside the window, requires tag)'
  );

export let messageTagSchema = z
  .enum(['CONFIRMED_EVENT_UPDATE', 'POST_PURCHASE_UPDATE', 'ACCOUNT_UPDATE', 'HUMAN_AGENT'])
  .optional()
  .describe(
    'Message tag for sending outside the standard messaging window. Required when messagingType is MESSAGE_TAG. Only HUMAN_AGENT is still accepted by Meta: a human agent may reply within 7 days of the person’s last message, and the app needs the Human Agent permission. CONFIRMED_EVENT_UPDATE, POST_PURCHASE_UPDATE, and ACCOUNT_UPDATE were retired by Meta and are rejected.'
  );

export let replyToMessageIdSchema = z
  .string()
  .min(1)
  .optional()
  .describe(
    'Message ID (mid) of an earlier message in this conversation to reply to. The message is shown as a quoted reply.'
  );

export let validateMessagingPolicy = (messagingType: string, tag?: string) => {
  if (messagingType === 'MESSAGE_TAG' && !tag) {
    throw messengerServiceError('tag is required when messagingType is MESSAGE_TAG');
  }

  if (tag && messagingType !== 'MESSAGE_TAG') {
    throw messengerServiceError('tag can only be used when messagingType is MESSAGE_TAG');
  }

  if (tag && RETIRED_MESSAGE_TAGS.has(tag)) {
    throw messengerServiceError(
      `Meta retired the ${tag} message tag on April 27, 2026 and rejects messages that use it. Send within the standard messaging window, or use HUMAN_AGENT for a human agent reply within 7 days.`
    );
  }
};
