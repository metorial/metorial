import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let incomingWhatsAppMessage = SlateTrigger.create(spec, {
  name: 'Incoming WhatsApp Message',
  key: 'incoming_whatsapp_message',
  description:
    'Triggered when a new WhatsApp message is received on your connected account. Supports text, image, video, audio, document, location, contacts, button replies, interactive flow forms, and order messages.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      messageType: z.string().describe('Type of WhatsApp message received'),
      timestamp: z.number().describe('Event timestamp in milliseconds'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      messageType: z
        .string()
        .describe(
          'Message type (text, image, video, audio, document, location, contacts, button, interactive, order)'
        ),
      senderName: z.string().optional().describe('Sender display name'),
      senderPhone: z.string().optional().describe('Sender phone number with country code'),
      phoneId: z.string().optional().describe('Meta phone ID'),
      wabaId: z.string().optional().describe('WhatsApp Business Account ID'),
      messageId: z.string().optional().describe('WhatsApp message ID'),
      textBody: z.string().optional().describe('Text message body (for text messages)'),
      mediaUrl: z.string().optional().describe('Media URL (for media messages)'),
      mediaMimeType: z.string().optional().describe('Media MIME type'),
      caption: z.string().optional().describe('Media caption'),
      latitude: z.number().optional().describe('Location latitude'),
      longitude: z.number().optional().describe('Location longitude'),
      locationName: z.string().optional().describe('Location name'),
      locationAddress: z.string().optional().describe('Location address'),
      timestamp: z.string().describe('Event timestamp as ISO string'),
      rawPayload: z.any().optional().describe('Complete raw webhook payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data || data.event !== 'incoming.whatsapp.message') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventId: data.eventId ?? `wa_${Date.now()}`,
            messageType: data.type ?? 'unknown',
            timestamp: data.timestamp ?? Date.now(),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload;

      let output: Record<string, any> = {
        eventId: ctx.input.eventId,
        messageType: ctx.input.messageType,
        senderName: payload.sender?.name,
        senderPhone: payload.sender?.number,
        phoneId: payload.phoneId,
        wabaId: payload.wabaId,
        messageId: payload.messageId,
        timestamp: new Date(ctx.input.timestamp).toISOString(),
        rawPayload: payload
      };

      let msgType = ctx.input.messageType;
      if (msgType === 'text') {
        output.textBody = payload.text?.body;
      } else if (['image', 'video', 'audio', 'document'].includes(msgType)) {
        let media = payload[msgType];
        output.mediaUrl = media?.url ?? media?.link;
        output.mediaMimeType = media?.mimeType ?? media?.mime_type;
        output.caption = media?.caption;
      } else if (msgType === 'location') {
        output.latitude = payload.location?.latitude;
        output.longitude = payload.location?.longitude;
        output.locationName = payload.location?.name;
        output.locationAddress = payload.location?.address;
      }

      return {
        type: 'whatsapp.message_received',
        id: ctx.input.eventId,
        output: output as any
      };
    }
  })
  .build();
