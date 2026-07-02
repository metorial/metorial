import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let incomingRcsMessage = SlateTrigger.create(spec, {
  name: 'Incoming RCS Message',
  key: 'incoming_rcs_message',
  description:
    'Triggered when a new RCS message is received. Supports text, quick reply buttons, image, video, audio, file, and location message types.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      messageType: z.string().describe('Type of RCS message received'),
      timestamp: z.number().describe('Event timestamp in milliseconds'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      messageType: z
        .string()
        .describe('Message type (text, reply, image, video, audio, file, location)'),
      senderPhone: z.string().optional().describe('Sender phone number with country code'),
      botId: z.string().optional().describe('RCS bot ID'),
      messageId: z.string().optional().describe('RCS message ID'),
      textBody: z.string().optional().describe('Text content (for text/reply messages)'),
      mediaUrl: z.string().optional().describe('Media file URL (for media messages)'),
      mediaMimeType: z.string().optional().describe('Media MIME type'),
      fileName: z.string().optional().describe('File name (for file messages)'),
      latitude: z.number().optional().describe('Location latitude'),
      longitude: z.number().optional().describe('Location longitude'),
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

      if (!data || data.event !== 'incoming.rcs.message') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventId: data.eventId ?? `rcs_${Date.now()}`,
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
        senderPhone: payload.sender?.number,
        botId: payload.botId,
        messageId: payload.messageId,
        timestamp: new Date(ctx.input.timestamp).toISOString(),
        rawPayload: payload
      };

      let msgType = ctx.input.messageType;
      if (msgType === 'text') {
        output.textBody = payload.text;
      } else if (msgType === 'reply') {
        output.textBody = payload.reply;
      } else if (['image', 'video', 'audio', 'file'].includes(msgType)) {
        let media = payload[msgType];
        output.mediaUrl = media?.fileUri ?? media?.url;
        output.mediaMimeType = media?.mimeType;
        output.fileName = media?.fileName;
      } else if (msgType === 'location') {
        output.latitude = payload.location?.latitude;
        output.longitude = payload.location?.longitude;
      }

      return {
        type: 'rcs.message_received',
        id: ctx.input.eventId,
        output: output as any
      };
    }
  })
  .build();
