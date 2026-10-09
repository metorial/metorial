import { z } from 'zod';

/**
 * Messenger Platform webhook shapes. Reference:
 * https://developers.facebook.com/docs/messenger-platform/webhooks
 * https://developers.facebook.com/docs/messenger-platform/reference/webhook-events
 */

let participant = z.object({ id: z.string() }).loose();

export let messengerMessagingEventSchema = z
  .object({
    sender: participant,
    recipient: participant,
    timestamp: z.number().optional(),
    message: z
      .object({
        mid: z.string(),
        text: z.string().optional(),
        is_echo: z.boolean().optional(),
        attachments: z
          .array(
            z
              .object({
                type: z.string(),
                payload: z.record(z.string(), z.unknown()).nullish()
              })
              .loose()
          )
          .optional(),
        reply_to: z.object({ mid: z.string().optional() }).loose().optional(),
        quick_reply: z.object({ payload: z.string().optional() }).loose().optional()
      })
      .loose()
      .optional(),
    message_edit: z
      .object({
        mid: z.string(),
        text: z.string().optional(),
        num_edit: z.number().optional()
      })
      .loose()
      .optional(),
    reaction: z
      .object({
        mid: z.string(),
        action: z.string(),
        reaction: z.string().optional(),
        emoji: z.string().optional()
      })
      .loose()
      .optional()
  })
  .loose();

export type MessengerMessagingEvent = z.infer<typeof messengerMessagingEventSchema>;

export let messengerWebhookEnvelopeSchema = z
  .object({
    object: z.string(),
    entry: z.array(
      z
        .object({
          id: z.union([z.string(), z.number()]),
          time: z.number().optional(),
          messaging: z.array(z.unknown()).optional()
        })
        .loose()
    )
  })
  .loose();

export let messengerEventTypes = ['message', 'message_edit', 'reaction'] as const;
export type MessengerEventType = (typeof messengerEventTypes)[number];

/**
 * One emitted event per supported `entry[].messaging[]` item. `pageId` is the
 * signed delivery's `entry[].id`; `messaging` is the provider event unchanged.
 */
export let messengerEventSchema = z.object({
  type: z.enum(messengerEventTypes),
  pageId: z.string(),
  entryTime: z.number().optional(),
  messaging: messengerMessagingEventSchema
});

export type MessengerEvent = z.infer<typeof messengerEventSchema>;

export let isMessengerEventOfType = (payload: unknown, type: MessengerEventType) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  let event = payload as { type?: unknown; pageId?: unknown; messaging?: unknown };
  return (
    event.type === type &&
    typeof event.pageId === 'string' &&
    !!event.messaging &&
    typeof event.messaging === 'object' &&
    !Array.isArray(event.messaging)
  );
};
