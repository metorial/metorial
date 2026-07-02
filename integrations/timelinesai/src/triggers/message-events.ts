import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let WEBHOOK_EVENT_TYPES = ['message:sent:new', 'message:received:new'] as const;

export let messageEvents = SlateTrigger.create(spec, {
  name: 'Message Events',
  key: 'message_events',
  description:
    'Triggers when a WhatsApp message is sent or received across any connected account in the workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of message event'),
      messageUid: z.string().describe('Unique message identifier'),
      chatId: z.number().optional().describe('Chat ID'),
      timestamp: z.string().optional().describe('Message timestamp'),
      senderPhone: z.string().optional().describe('Sender phone number'),
      senderName: z.string().optional().describe('Sender display name'),
      recipientPhone: z.string().optional().describe('Recipient phone number'),
      recipientName: z.string().optional().describe('Recipient display name'),
      fromMe: z.boolean().optional().describe('Whether sent by my account'),
      text: z.string().optional().describe('Message text content'),
      hasAttachment: z.boolean().optional().describe('Whether message has an attachment'),
      attachmentUrl: z.string().optional().describe('Attachment download URL'),
      attachmentFilename: z.string().optional().describe('Attachment filename'),
      whatsappAccountPhone: z.string().optional().describe('WhatsApp account phone'),
      chatName: z.string().optional().describe('Chat display name'),
      isGroup: z.boolean().optional().describe('Whether this is a group chat'),
      isNewChat: z.boolean().optional().describe('Whether this started a new chat')
    })
  )
  .output(
    z.object({
      messageUid: z.string().describe('Unique message identifier'),
      chatId: z.number().optional().describe('Chat ID'),
      timestamp: z.string().optional().describe('Message timestamp'),
      senderPhone: z.string().optional().describe('Sender phone number'),
      senderName: z.string().optional().describe('Sender display name'),
      recipientPhone: z.string().optional().describe('Recipient phone number'),
      recipientName: z.string().optional().describe('Recipient display name'),
      fromMe: z.boolean().optional().describe('Whether sent by the workspace account'),
      text: z.string().optional().describe('Message text content'),
      hasAttachment: z.boolean().optional().describe('Whether the message has an attachment'),
      attachmentUrl: z.string().optional().describe('Attachment download URL (valid 15 min)'),
      attachmentFilename: z.string().optional().describe('Attachment filename'),
      whatsappAccountPhone: z.string().optional().describe('WhatsApp account phone number'),
      chatName: z.string().optional().describe('Chat display name'),
      isGroup: z.boolean().optional().describe('Whether this is a group chat'),
      isNewChat: z.boolean().optional().describe('Whether this message started a new chat')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let registrations: Array<{ webhookId: number; eventType: string }> = [];

      for (let eventType of WEBHOOK_EVENT_TYPES) {
        let result = await client.createWebhook({
          eventType,
          url: ctx.input.webhookBaseUrl,
          enabled: true
        });
        let webhookData = result?.data || result;
        registrations.push({
          webhookId: webhookData.id,
          eventType
        });
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let registrations = (ctx.input.registrationDetails as any)?.registrations || [];

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.webhookId);
        } catch (_e) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // TimelinesAI webhook payload can contain a single message or bundled messages
      let messages: any[] = [];

      if (body.messages && Array.isArray(body.messages)) {
        messages = body.messages;
      } else if (body.message) {
        messages = [body.message];
      } else if (body.text || body.message_id) {
        messages = [body];
      }

      let account = body.whatsapp_account || body.account || {};
      let chat = body.chat || {};

      let inputs = messages.map((msg: any) => {
        let fromMe = msg.direction === 'out' || msg.from_me === true;
        return {
          eventType: fromMe ? 'message:sent:new' : 'message:received:new',
          messageUid:
            msg.message_id ||
            msg.uid ||
            msg.id ||
            `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          chatId: chat.chat_id || msg.chat_id,
          timestamp: msg.timestamp,
          senderPhone: msg.sender || msg.sender_phone || (fromMe ? account.phone : chat.phone),
          senderName: msg.sender_name || (fromMe ? account.full_name : chat.full_name),
          recipientPhone:
            msg.recipient || msg.recipient_phone || (!fromMe ? account.phone : chat.phone),
          recipientName: msg.recipient_name,
          fromMe,
          text: msg.text || '',
          hasAttachment: !!(msg.attachment || msg.attachment_url),
          attachmentUrl: msg.attachment?.temporary_download_url || msg.attachment_url,
          attachmentFilename: msg.attachment?.filename || msg.attachment_filename,
          whatsappAccountPhone: account.phone,
          chatName: chat.full_name || chat.name,
          isGroup: chat.is_group,
          isNewChat: chat.is_new_chat
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: input.fromMe ? 'message.sent' : 'message.received',
        id: input.messageUid,
        output: {
          messageUid: input.messageUid,
          chatId: input.chatId,
          timestamp: input.timestamp,
          senderPhone: input.senderPhone,
          senderName: input.senderName,
          recipientPhone: input.recipientPhone,
          recipientName: input.recipientName,
          fromMe: input.fromMe,
          text: input.text,
          hasAttachment: input.hasAttachment,
          attachmentUrl: input.attachmentUrl,
          attachmentFilename: input.attachmentFilename,
          whatsappAccountPhone: input.whatsappAccountPhone,
          chatName: input.chatName,
          isGroup: input.isGroup,
          isNewChat: input.isNewChat
        }
      };
    }
  })
  .build();
