import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let groupChatReceived = SlateTrigger.create(spec, {
  name: 'Group Chat Received',
  key: 'group_chat_received',
  description:
    'Triggers when a new chat message is posted in a specific Habitica group (party or guild).'
})
  .input(
    z.object({
      messageId: z.string().describe('Chat message ID'),
      groupId: z.string().describe('Group ID'),
      text: z.string().optional().describe('Message text'),
      senderUserId: z.string().optional().describe('Sender user ID'),
      senderUsername: z.string().optional().describe('Sender username'),
      timestamp: z.string().optional().describe('When the message was posted')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Chat message ID'),
      groupId: z.string().describe('Group ID where message was posted'),
      text: z.string().optional().describe('Message text content'),
      senderUserId: z.string().optional().describe('User ID of the sender'),
      senderUsername: z.string().optional().describe('Username of the sender'),
      timestamp: z.string().optional().describe('When the message was posted')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new HabiticaClient({
        userId: ctx.auth.userId,
        token: ctx.auth.token,
        xClient: ctx.config.xClient
      });

      // Get user's party to register webhook for it by default
      let user = await client.getUser('party');
      let groupId = user.party?._id;

      if (!groupId) {
        throw new Error(
          'User is not in a party. A group ID is required for group chat webhooks.'
        );
      }

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        label: 'Slates Group Chat',
        type: 'groupChatReceived',
        enabled: true,
        options: {
          groupId
        }
      });

      return {
        registrationDetails: {
          webhookId: webhook.id || webhook._id,
          groupId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new HabiticaClient({
        userId: ctx.auth.userId,
        token: ctx.auth.token,
        xClient: ctx.config.xClient
      });

      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;

      let chat = body.chat || body;
      let groupId = body.group?.id || body.group?._id || body.groupId || '';

      return {
        inputs: [
          {
            messageId: chat.id || chat._id || `chat-${Date.now()}`,
            groupId,
            text: chat.text || chat.message,
            senderUserId: chat.uuid || chat.userId,
            senderUsername: chat.user || chat.username,
            timestamp: chat.timestamp || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'group_chat.received',
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          groupId: ctx.input.groupId,
          text: ctx.input.text,
          senderUserId: ctx.input.senderUserId,
          senderUsername: ctx.input.senderUsername,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
