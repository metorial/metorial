import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let chatEvents = SlateTrigger.create(spec, {
  name: 'Chat Events',
  key: 'chat_events',
  description:
    'Triggers when a new chat is created or an existing chat is renamed in the workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of chat event (chat.created or chat.renamed)'),
      chatId: z.number().describe('Chat ID'),
      chatName: z.string().optional().describe('Chat display name'),
      phone: z.string().optional().describe('Contact phone number'),
      isGroup: z.boolean().optional().describe('Whether this is a group chat'),
      whatsappAccountPhone: z.string().optional().describe('WhatsApp account phone'),
      responsible: z.string().optional().describe('Assigned team member'),
      previousName: z.string().optional().describe('Previous chat name (for rename events)')
    })
  )
  .output(
    z.object({
      chatId: z.number().describe('Chat ID'),
      chatName: z.string().optional().describe('Chat display name'),
      phone: z.string().optional().describe('Contact phone number'),
      isGroup: z.boolean().optional().describe('Whether this is a group chat'),
      whatsappAccountPhone: z.string().optional().describe('WhatsApp account phone'),
      responsible: z.string().optional().describe('Assigned team member email'),
      previousName: z.string().optional().describe('Previous chat name (for rename events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let eventTypes = ['chat.created', 'chat.renamed'];
      let registrations: Array<{ webhookId: number; eventType: string }> = [];

      for (let eventType of eventTypes) {
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

      let chat = body.chat || body;
      let account = body.whatsapp_account || body.account || {};

      let eventType = body.event_type || body.event || 'chat.created';
      if (eventType === 'chat.renamed' || body.previous_name || body.old_name) {
        eventType = 'chat.renamed';
      }

      let chatId = chat.chat_id || chat.id || body.chat_id;

      return {
        inputs: [
          {
            eventType,
            chatId,
            chatName: chat.full_name || chat.name || body.name,
            phone: chat.phone || body.phone,
            isGroup: chat.is_group ?? body.is_group,
            whatsappAccountPhone: account.phone,
            responsible: chat.responsible_email || chat.responsible,
            previousName: body.previous_name || body.old_name
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: input.eventType === 'chat.renamed' ? 'chat.renamed' : 'chat.created',
        id: `${input.chatId}-${input.eventType}-${Date.now()}`,
        output: {
          chatId: input.chatId,
          chatName: input.chatName,
          phone: input.phone,
          isGroup: input.isGroup,
          whatsappAccountPhone: input.whatsappAccountPhone,
          responsible: input.responsible,
          previousName: input.previousName
        }
      };
    }
  })
  .build();
