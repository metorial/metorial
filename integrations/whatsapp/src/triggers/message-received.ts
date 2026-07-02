import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let messageReceived = SlateTrigger.create(spec, {
  name: 'Message Received',
  key: 'message_received',
  description:
    'Triggers when an incoming WhatsApp message is received. Covers text, image, audio, video, document, sticker, location, contacts, interactive replies, reactions, and order messages.'
})
  .input(
    z.object({
      messageId: z.string().describe('Unique message ID'),
      messageType: z
        .string()
        .describe(
          'Message type (text, image, audio, video, document, sticker, location, contacts, interactive, reaction, order, system)'
        ),
      from: z.string().describe('Sender phone number'),
      senderName: z.string().optional().describe('Sender profile name'),
      timestamp: z.string().describe('Message timestamp'),
      phoneNumberId: z.string().describe('Receiving phone number ID'),
      displayPhoneNumber: z.string().optional().describe('Receiving display phone number'),
      message: z.any().describe('Full message payload from WhatsApp')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message ID'),
      messageType: z.string().describe('Message type'),
      from: z.string().describe('Sender phone number'),
      senderName: z.string().optional().describe('Sender profile name'),
      timestamp: z.string().describe('Message timestamp (Unix epoch)'),
      phoneNumberId: z.string().describe('Receiving phone number ID'),
      displayPhoneNumber: z.string().optional().describe('Receiving display phone number'),
      textBody: z.string().optional().describe('Text message body (for text messages)'),
      mediaId: z.string().optional().describe('Media ID (for media messages)'),
      mediaMimeType: z.string().optional().describe('Media MIME type'),
      locationLatitude: z.number().optional().describe('Latitude (for location messages)'),
      locationLongitude: z.number().optional().describe('Longitude (for location messages)'),
      locationName: z.string().optional().describe('Location name'),
      locationAddress: z.string().optional().describe('Location address'),
      interactiveType: z
        .string()
        .optional()
        .describe('Interactive response type (button_reply, list_reply)'),
      interactiveReplyId: z.string().optional().describe('Selected button/list row ID'),
      interactiveReplyTitle: z.string().optional().describe('Selected button/list row title'),
      reactionEmoji: z.string().optional().describe('Reaction emoji'),
      reactionMessageId: z.string().optional().describe('Message ID that was reacted to'),
      contacts: z.any().optional().describe('Contacts data (for contacts messages)'),
      referral: z
        .any()
        .optional()
        .describe('Referral data if message came from an ad or post'),
      context: z
        .object({
          messageId: z.string().optional().describe('Referenced message ID (for replies)'),
          from: z.string().optional().describe('Phone number of referenced message sender')
        })
        .optional()
        .describe('Message context for replies')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let method = ctx.request.method;

      // Handle webhook verification GET request
      if (method === 'GET') {
        let url = new URL(ctx.request.url);
        let mode = url.searchParams.get('hub.mode');
        let challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && challenge) {
          return {
            inputs: [],
            response: new Response(challenge, {
              status: 200,
              headers: { 'Content-Type': 'text/plain' }
            })
          };
        }
        return { inputs: [], response: new Response('Bad request', { status: 400 }) };
      }

      let body = (await ctx.request.json()) as any;

      if (body.object !== 'whatsapp_business_account') {
        return { inputs: [] };
      }

      let inputs: any[] = [];

      for (let entry of body.entry ?? []) {
        for (let change of entry.changes ?? []) {
          if (change.field !== 'messages') continue;

          let value = change.value;
          let metadata = value?.metadata ?? {};
          let contacts = value?.contacts ?? [];
          let messages = value?.messages ?? [];

          for (let msg of messages) {
            let contactInfo = contacts.find((c: any) => c.wa_id === msg.from);

            inputs.push({
              messageId: msg.id,
              messageType: msg.type,
              from: msg.from,
              senderName: contactInfo?.profile?.name,
              timestamp: msg.timestamp,
              phoneNumberId: metadata.phone_number_id,
              displayPhoneNumber: metadata.display_phone_number,
              message: msg
            });
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let msg = ctx.input.message;
      let output: Record<string, any> = {
        messageId: ctx.input.messageId,
        messageType: ctx.input.messageType,
        from: ctx.input.from,
        senderName: ctx.input.senderName,
        timestamp: ctx.input.timestamp,
        phoneNumberId: ctx.input.phoneNumberId,
        displayPhoneNumber: ctx.input.displayPhoneNumber
      };

      switch (ctx.input.messageType) {
        case 'text':
          output.textBody = msg.text?.body;
          break;
        case 'image':
          output.mediaId = msg.image?.id;
          output.mediaMimeType = msg.image?.mime_type;
          break;
        case 'video':
          output.mediaId = msg.video?.id;
          output.mediaMimeType = msg.video?.mime_type;
          break;
        case 'audio':
          output.mediaId = msg.audio?.id;
          output.mediaMimeType = msg.audio?.mime_type;
          break;
        case 'document':
          output.mediaId = msg.document?.id;
          output.mediaMimeType = msg.document?.mime_type;
          break;
        case 'sticker':
          output.mediaId = msg.sticker?.id;
          output.mediaMimeType = msg.sticker?.mime_type;
          break;
        case 'location':
          output.locationLatitude = msg.location?.latitude;
          output.locationLongitude = msg.location?.longitude;
          output.locationName = msg.location?.name;
          output.locationAddress = msg.location?.address;
          break;
        case 'contacts':
          output.contacts = msg.contacts;
          break;
        case 'interactive':
          if (msg.interactive?.type === 'button_reply') {
            output.interactiveType = 'button_reply';
            output.interactiveReplyId = msg.interactive.button_reply?.id;
            output.interactiveReplyTitle = msg.interactive.button_reply?.title;
          } else if (msg.interactive?.type === 'list_reply') {
            output.interactiveType = 'list_reply';
            output.interactiveReplyId = msg.interactive.list_reply?.id;
            output.interactiveReplyTitle = msg.interactive.list_reply?.title;
          }
          break;
        case 'reaction':
          output.reactionEmoji = msg.reaction?.emoji;
          output.reactionMessageId = msg.reaction?.message_id;
          break;
      }

      if (msg.referral) {
        output.referral = msg.referral;
      }

      if (msg.context) {
        output.context = {
          messageId: msg.context.id,
          from: msg.context.from
        };
      }

      return {
        type: `message.${ctx.input.messageType}`,
        id: ctx.input.messageId,
        output: output as any
      };
    }
  })
  .build();
