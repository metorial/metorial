import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

let attachmentSchema = z
  .object({
    type: z
      .string()
      .describe('Attachment type (image, video, audio, file, location, fallback)'),
    url: z.string().optional().describe('URL of the attachment')
  })
  .describe('A message attachment');

export let messageReceived = SlateTrigger.create(spec, {
  name: 'Message Received',
  key: 'message_received',
  description:
    'Triggered when a user sends a message to your Page, including text messages, attachments, quick reply responses, and reactions.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of messaging event'),
      eventId: z.string().describe('Unique event identifier'),
      senderId: z.string().describe('PSID of the sender'),
      recipientId: z.string().describe('Page ID of the recipient'),
      timestamp: z.string().describe('Event timestamp'),
      messageId: z.string().optional().describe('Message ID'),
      text: z.string().optional().describe('Text content of the message'),
      attachments: z.array(attachmentSchema).optional().describe('Message attachments'),
      quickReplyPayload: z
        .string()
        .optional()
        .describe('Quick reply payload if user tapped a quick reply'),
      postbackTitle: z.string().optional().describe('Title of the postback button'),
      postbackPayload: z.string().optional().describe('Payload of the postback button'),
      referralRef: z.string().optional().describe('Referral ref parameter'),
      referralSource: z.string().optional().describe('Source of the referral'),
      reactionAction: z.string().optional().describe('Reaction action (react or unreact)'),
      reactionEmoji: z.string().optional().describe('Reaction emoji'),
      reactionMessageId: z.string().optional().describe('Message ID the reaction is on')
    })
  )
  .output(
    z.object({
      senderId: z.string().describe('PSID of the user who triggered the event'),
      recipientPageId: z.string().describe('Page ID that received the event'),
      timestamp: z.string().describe('Event timestamp'),
      messageId: z.string().optional().describe('Message ID (for message events)'),
      text: z.string().optional().describe('Text content of the message'),
      attachments: z.array(attachmentSchema).optional().describe('Message attachments'),
      quickReplyPayload: z.string().optional().describe('Quick reply payload'),
      postbackTitle: z.string().optional().describe('Postback button title'),
      postbackPayload: z.string().optional().describe('Postback button payload'),
      referralRef: z.string().optional().describe('Referral ref parameter'),
      referralSource: z.string().optional().describe('Source of the referral'),
      reactionAction: z.string().optional().describe('Reaction action (react or unreact)'),
      reactionEmoji: z.string().optional().describe('Reaction emoji'),
      reactionMessageId: z.string().optional().describe('Message ID the reaction is on')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let request = ctx.request;
      let method = request.method;

      // Handle webhook verification (GET request)
      if (method === 'GET') {
        // Verification requests don't produce events
        return { inputs: [] };
      }

      // Handle incoming events (POST request)
      let body = (await request.json()) as any;

      if (body.object !== 'page') {
        return { inputs: [] };
      }

      let inputs: any[] = [];

      for (let entry of body.entry || []) {
        let pageId = entry.id as string;

        for (let messagingEvent of entry.messaging || []) {
          let senderId = messagingEvent.sender?.id as string;
          let recipientId = (messagingEvent.recipient?.id as string) || pageId;
          let timestamp = String(messagingEvent.timestamp || Date.now());

          if (messagingEvent.message) {
            let msg = messagingEvent.message;

            // Skip echo messages (sent by the page itself)
            if (msg.is_echo) continue;

            let attachments = msg.attachments?.map((att: any) => ({
              type: att.type,
              url: att.payload?.url
            }));

            inputs.push({
              eventType: 'message',
              eventId: msg.mid || `msg_${timestamp}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              messageId: msg.mid,
              text: msg.text,
              attachments: attachments?.length > 0 ? attachments : undefined,
              quickReplyPayload: msg.quick_reply?.payload
            });
          }

          if (messagingEvent.postback) {
            let pb = messagingEvent.postback;
            inputs.push({
              eventType: 'postback',
              eventId: `pb_${timestamp}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              postbackTitle: pb.title,
              postbackPayload: pb.payload,
              referralRef: pb.referral?.ref,
              referralSource: pb.referral?.source
            });
          }

          if (messagingEvent.referral) {
            let ref = messagingEvent.referral;
            inputs.push({
              eventType: 'referral',
              eventId: `ref_${timestamp}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              referralRef: ref.ref,
              referralSource: ref.source
            });
          }

          if (messagingEvent.reaction) {
            let reaction = messagingEvent.reaction;
            inputs.push({
              eventType: 'reaction',
              eventId: `react_${timestamp}_${senderId}_${reaction.mid}`,
              senderId,
              recipientId,
              timestamp,
              reactionAction: reaction.action,
              reactionEmoji: reaction.emoji,
              reactionMessageId: reaction.mid
            });
          }

          if (messagingEvent.optin) {
            inputs.push({
              eventType: 'optin',
              eventId: `optin_${timestamp}_${senderId}`,
              senderId,
              recipientId,
              timestamp
            });
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let { input } = ctx;

      return {
        type: `message.${input.eventType}`,
        id: input.eventId,
        output: {
          senderId: input.senderId,
          recipientPageId: input.recipientId,
          timestamp: input.timestamp,
          messageId: input.messageId,
          text: input.text,
          attachments: input.attachments,
          quickReplyPayload: input.quickReplyPayload,
          postbackTitle: input.postbackTitle,
          postbackPayload: input.postbackPayload,
          referralRef: input.referralRef,
          referralSource: input.referralSource,
          reactionAction: input.reactionAction,
          reactionEmoji: input.reactionEmoji,
          reactionMessageId: input.reactionMessageId
        }
      };
    }
  })
  .build();
