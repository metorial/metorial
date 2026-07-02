import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { generateSecretToken, verifySecretToken } from '../lib/webhook-utils';
import { spec } from '../spec';

export let chatBoostUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Chat Boost Updated',
  key: 'chat_boost_updated',
  description:
    'Triggers when a chat boost is added, changed, or removed. The bot must be an administrator in the chat.'
})
  .input(
    z.object({
      updateId: z.number().describe('Unique update identifier'),
      eventType: z.string().describe('Type of boost event'),
      boostData: z.any().describe('Raw boost event data')
    })
  )
  .output(
    z.object({
      chatId: z.string().describe('Chat ID where the boost occurred'),
      chatTitle: z.string().optional().describe('Chat title'),
      boostId: z.string().describe('Unique boost identifier'),
      addDate: z.number().optional().describe('Unix timestamp when the boost was added'),
      expirationDate: z.number().optional().describe('Unix timestamp when the boost expires'),
      removeDate: z.number().optional().describe('Unix timestamp when the boost was removed'),
      sourceType: z
        .string()
        .optional()
        .describe('Source of the boost (e.g. premium, gift_code, giveaway)'),
      sourceUserId: z.number().optional().describe('User ID of the boost source')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      let secretToken = generateSecretToken();

      await client.setWebhook({
        url: ctx.input.webhookBaseUrl,
        allowedUpdates: ['chat_boost', 'removed_chat_boost'],
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
      let inputs: Array<{ updateId: number; eventType: string; boostData: any }> = [];

      if (data.chat_boost) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'chat_boost',
          boostData: data.chat_boost
        });
      } else if (data.removed_chat_boost) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'removed_chat_boost',
          boostData: data.removed_chat_boost
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let d = ctx.input.boostData;
      let isRemoved = ctx.input.eventType === 'removed_chat_boost';

      let boost = isRemoved ? d : d.boost;

      return {
        type: `chat_boost.${isRemoved ? 'removed' : 'updated'}`,
        id: `${ctx.input.updateId}`,
        output: {
          chatId: String(d.chat.id),
          chatTitle: d.chat.title,
          boostId: boost.boost_id,
          addDate: !isRemoved ? boost.add_date : undefined,
          expirationDate: boost.expiration_date,
          removeDate: isRemoved ? d.remove_date : undefined,
          sourceType: boost.source?.type,
          sourceUserId: boost.source?.user?.id
        }
      };
    }
  })
  .build();
