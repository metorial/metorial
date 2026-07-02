import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { generateSecretToken, verifySecretToken } from '../lib/webhook-utils';
import { spec } from '../spec';

let reactionSchema = z.object({
  type: z.string().describe('Reaction type (e.g. "emoji", "custom_emoji")'),
  emoji: z.string().optional().describe('Emoji character'),
  customEmojiId: z.string().optional().describe('Custom emoji identifier')
});

export let reactionUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Message Reaction',
  key: 'reaction_updated',
  description:
    'Triggers when a reaction to a message is changed by a user or when anonymous reaction counts change. The bot must be an administrator and must explicitly request these updates.'
})
  .input(
    z.object({
      updateId: z.number().describe('Unique update identifier'),
      eventType: z.string().describe('Type of reaction event'),
      reactionData: z.any().describe('Raw reaction event data')
    })
  )
  .output(
    z.object({
      chatId: z.string().describe('Chat ID where the reaction occurred'),
      messageId: z.number().describe('Message ID that was reacted to'),
      userId: z
        .number()
        .optional()
        .describe('User ID who changed their reaction (message_reaction only)'),
      userFirstName: z.string().optional().describe('First name of the user'),
      date: z.number().optional().describe('Unix timestamp of the reaction change'),
      oldReactions: z
        .array(reactionSchema)
        .optional()
        .describe('Previous reactions by the user'),
      newReactions: z.array(reactionSchema).optional().describe('New reactions by the user'),
      totalReactions: z
        .array(
          z.object({
            type: z.string().describe('Reaction type'),
            emoji: z.string().optional().describe('Emoji character'),
            customEmojiId: z.string().optional().describe('Custom emoji ID'),
            totalCount: z.number().describe('Total count of this reaction')
          })
        )
        .optional()
        .describe('All reaction counts (message_reaction_count only)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      let secretToken = generateSecretToken();

      await client.setWebhook({
        url: ctx.input.webhookBaseUrl,
        allowedUpdates: ['message_reaction', 'message_reaction_count'],
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
      let inputs: Array<{ updateId: number; eventType: string; reactionData: any }> = [];

      if (data.message_reaction) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'message_reaction',
          reactionData: data.message_reaction
        });
      } else if (data.message_reaction_count) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'message_reaction_count',
          reactionData: data.message_reaction_count
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let d = ctx.input.reactionData;
      let isIndividual = ctx.input.eventType === 'message_reaction';

      let mapReaction = (r: any) => ({
        type: r.type,
        emoji: r.emoji,
        customEmojiId: r.custom_emoji_id
      });

      return {
        type: `reaction.${ctx.input.eventType}`,
        id: `${ctx.input.updateId}`,
        output: {
          chatId: String(d.chat.id),
          messageId: d.message_id,
          userId: isIndividual ? d.user?.id : undefined,
          userFirstName: isIndividual ? d.user?.first_name : undefined,
          date: d.date,
          oldReactions: isIndividual ? d.old_reaction?.map(mapReaction) : undefined,
          newReactions: isIndividual ? d.new_reaction?.map(mapReaction) : undefined,
          totalReactions: !isIndividual
            ? d.reactions?.map((r: any) => ({
                type: r.type.type,
                emoji: r.type.emoji,
                customEmojiId: r.type.custom_emoji_id,
                totalCount: r.total_count
              }))
            : undefined
        }
      };
    }
  })
  .build();
