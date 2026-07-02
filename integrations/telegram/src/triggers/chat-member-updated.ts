import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { generateSecretToken, verifySecretToken } from '../lib/webhook-utils';
import { spec } from '../spec';

export let chatMemberUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Chat Member Updated',
  key: 'chat_member_updated',
  description:
    "Triggers when a chat member's status changes, the bot's own member status changes, or a join request is received. Covers my_chat_member, chat_member, and chat_join_request events."
})
  .input(
    z.object({
      updateId: z.number().describe('Unique update identifier'),
      eventType: z.string().describe('Type of chat member event'),
      eventData: z.any().describe('Raw event data from Telegram')
    })
  )
  .output(
    z.object({
      chatId: z.string().describe('Chat ID where the event occurred'),
      chatType: z.string().describe('Chat type: private, group, supergroup, or channel'),
      chatTitle: z.string().optional().describe('Chat title'),
      userId: z.number().describe('User ID of the affected member'),
      userFirstName: z.string().describe('First name of the affected member'),
      userUsername: z.string().optional().describe('Username of the affected member'),
      oldStatus: z.string().optional().describe('Previous member status'),
      newStatus: z.string().optional().describe('New member status'),
      date: z.number().describe('Unix timestamp of the event'),
      inviteLink: z.string().optional().describe('Invite link used (for join requests)'),
      bio: z.string().optional().describe('User bio (for join requests)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      let secretToken = generateSecretToken();

      await client.setWebhook({
        url: ctx.input.webhookBaseUrl,
        allowedUpdates: ['my_chat_member', 'chat_member', 'chat_join_request'],
        secretToken
      });

      return {
        registrationDetails: { secretToken }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      await client.deleteWebhook();
    },

    handleRequest: async ctx => {
      let registrationDetails = ctx.state?.registrationDetails;
      if (registrationDetails?.secretToken) {
        if (!verifySecretToken(ctx.request, registrationDetails.secretToken)) {
          return { inputs: [] };
        }
      }

      let data = (await ctx.request.json()) as any;
      let inputs: Array<{ updateId: number; eventType: string; eventData: any }> = [];

      if (data.my_chat_member) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'my_chat_member',
          eventData: data.my_chat_member
        });
      } else if (data.chat_member) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'chat_member',
          eventData: data.chat_member
        });
      } else if (data.chat_join_request) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'chat_join_request',
          eventData: data.chat_join_request
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let d = ctx.input.eventData;
      let isJoinRequest = ctx.input.eventType === 'chat_join_request';

      let userId: number;
      let userFirstName: string;
      let userUsername: string | undefined;
      let oldStatus: string | undefined;
      let newStatus: string | undefined;

      if (isJoinRequest) {
        userId = d.from.id;
        userFirstName = d.from.first_name;
        userUsername = d.from.username;
      } else {
        userId = d.new_chat_member?.user?.id ?? d.from?.id;
        userFirstName = d.new_chat_member?.user?.first_name ?? d.from?.first_name;
        userUsername = d.new_chat_member?.user?.username ?? d.from?.username;
        oldStatus = d.old_chat_member?.status;
        newStatus = d.new_chat_member?.status;
      }

      return {
        type: `chat_member.${ctx.input.eventType}`,
        id: `${ctx.input.updateId}`,
        output: {
          chatId: String(d.chat.id),
          chatType: d.chat.type,
          chatTitle: d.chat.title,
          userId,
          userFirstName,
          userUsername,
          oldStatus,
          newStatus,
          date: d.date,
          inviteLink: isJoinRequest ? d.invite_link?.invite_link : undefined,
          bio: isJoinRequest ? d.bio : undefined
        }
      };
    }
  })
  .build();
