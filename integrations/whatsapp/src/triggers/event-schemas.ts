import { z } from 'zod';

// https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages

let nullishString = () => z.string().nullish();

export let whatsappContactSchema = z.looseObject({
  wa_id: nullishString(),
  user_id: nullishString(),
  parent_user_id: nullishString(),
  profile: z
    .looseObject({
      name: nullishString(),
      username: nullishString()
    })
    .nullish()
});

export type WhatsAppContact = z.infer<typeof whatsappContactSchema>;

export let whatsappMessageSchema = z.looseObject({
  id: z.string().min(1),
  type: z.string().min(1),
  timestamp: nullishString(),
  from: nullishString(),
  from_user_id: nullishString(),
  group_id: nullishString()
});

export type WhatsAppInboundMessage = z.infer<typeof whatsappMessageSchema> &
  Record<string, any>;

export let whatsappChangeValueSchema = z.looseObject({
  messaging_product: nullishString(),
  metadata: z
    .looseObject({
      display_phone_number: nullishString(),
      phone_number_id: nullishString()
    })
    .nullish(),
  contacts: z.array(z.unknown()).nullish(),
  messages: z.array(z.unknown()).nullish(),
  statuses: z.array(z.unknown()).nullish(),
  errors: z.array(z.unknown()).nullish()
});

export let whatsappWebhookEnvelopeSchema = z.looseObject({
  object: z.string(),
  entry: z.array(
    z.looseObject({
      id: nullishString(),
      changes: z
        .array(
          z.looseObject({
            field: nullishString(),
            value: z.unknown()
          })
        )
        .nullish()
    })
  )
});

// One event per inbound message, flattened with the phone number and sender contact.
export let whatsappMessageEventSchema = z.object({
  kind: z.literal('message'),
  wabaId: z.string().optional(),
  phoneNumberId: z.string(),
  displayPhoneNumber: z.string().optional(),
  contact: whatsappContactSchema.optional(),
  message: whatsappMessageSchema
});

export type WhatsAppMessageEvent = z.infer<typeof whatsappMessageEventSchema> & {
  message: WhatsAppInboundMessage;
};

export let WHATSAPP_RECEIVED_MESSAGE_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'sticker',
  'location',
  'contacts',
  'interactive',
  'button',
  'order'
] as const;

let receivedTypes = new Set<string>(WHATSAPP_RECEIVED_MESSAGE_TYPES);

export let isWhatsAppReceivedMessageType = (type: unknown) =>
  typeof type === 'string' && receivedTypes.has(type);

export let isWhatsAppHandledMessageType = (type: unknown) =>
  type === 'reaction' || isWhatsAppReceivedMessageType(type);
