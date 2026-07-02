import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { generateSecretToken, verifySecretToken } from '../lib/webhook-utils';
import { spec } from '../spec';

export let inlineQueryReceivedTrigger = SlateTrigger.create(spec, {
  name: 'Inline Query Received',
  key: 'inline_query_received',
  description:
    'Triggers when a user types "@botname query" in any chat, sending an inline query to the bot.'
})
  .input(
    z.object({
      updateId: z.number().describe('Unique update identifier'),
      eventType: z.string().describe('Type of inline event'),
      inlineData: z.any().describe('Raw inline query or chosen result object')
    })
  )
  .output(
    z.object({
      inlineQueryId: z
        .string()
        .optional()
        .describe('Unique inline query identifier (use to answer the query)'),
      query: z.string().optional().describe('Text of the inline query'),
      offset: z.string().optional().describe('Offset for pagination'),
      fromUserId: z.number().describe('User ID of the person making the inline query'),
      fromFirstName: z.string().describe('First name of the user'),
      fromUsername: z.string().optional().describe('Username of the user'),
      chatType: z.string().optional().describe('Type of chat the inline query was sent from'),
      chosenResultId: z
        .string()
        .optional()
        .describe('ID of the chosen inline result (chosen_inline_result only)'),
      chosenInlineMessageId: z
        .string()
        .optional()
        .describe('Inline message ID of the chosen result')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TelegramClient(ctx.auth.token);
      let secretToken = generateSecretToken();

      await client.setWebhook({
        url: ctx.input.webhookBaseUrl,
        allowedUpdates: ['inline_query', 'chosen_inline_result'],
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
      let inputs: Array<{ updateId: number; eventType: string; inlineData: any }> = [];

      if (data.inline_query) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'inline_query',
          inlineData: data.inline_query
        });
      } else if (data.chosen_inline_result) {
        inputs.push({
          updateId: data.update_id,
          eventType: 'chosen_inline_result',
          inlineData: data.chosen_inline_result
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let d = ctx.input.inlineData;
      let isQuery = ctx.input.eventType === 'inline_query';

      return {
        type: `inline.${ctx.input.eventType}`,
        id: `${ctx.input.updateId}`,
        output: {
          inlineQueryId: isQuery ? d.id : undefined,
          query: isQuery ? d.query : d.query,
          offset: isQuery ? d.offset : undefined,
          fromUserId: d.from.id,
          fromFirstName: d.from.first_name,
          fromUsername: d.from.username,
          chatType: isQuery ? d.chat_type : undefined,
          chosenResultId: !isQuery ? d.result_id : undefined,
          chosenInlineMessageId: !isQuery ? d.inline_message_id : undefined
        }
      };
    }
  })
  .build();
