import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let newConversations = SlateTrigger.create(spec, {
  name: 'New Conversations',
  key: 'new_conversations',
  description:
    'Triggers when new conversation sessions are created with a bot. Polls for new conversations. Monitors the bot specified in the global config botId, or all bots if not set.'
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID the conversation belongs to'),
      conversationId: z.string().describe('Conversation identifier'),
      title: z.string().optional().describe('Conversation title'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp'),
      model: z.string().optional().describe('AI model used'),
      answered: z.boolean().optional().describe('Whether the bot answered'),
      summary: z.string().optional().describe('Conversation summary'),
      sentiment: z.string().optional().describe('Conversation sentiment'),
      resolved: z.string().optional().describe('Resolution status'),
      escalated: z.string().optional().describe('Escalation status'),
      alias: z.string().optional().describe('Anonymous username')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation identifier'),
      botId: z.string().describe('Bot ID the conversation belongs to'),
      title: z.string().optional().describe('Conversation title'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp'),
      model: z.string().optional().describe('AI model used'),
      answered: z.boolean().optional().describe('Whether the bot answered'),
      summary: z.string().optional().describe('Conversation summary'),
      sentiment: z.string().optional().describe('Sentiment: positive, negative, neutral'),
      resolved: z.string().optional().describe('Resolution status'),
      escalated: z.string().optional().describe('Escalation status'),
      alias: z.string().optional().describe('Anonymous username')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DocsBotAdminClient(ctx.auth.token);
      let teamId = ctx.config.teamId;
      let lastSeenTimestamp = ctx.state?.lastSeenTimestamp as string | undefined;

      let botIds: string[] = [];
      if (ctx.config.botId) {
        botIds = [ctx.config.botId];
      } else {
        let bots = await client.listBots(teamId);
        botIds = bots.map(b => b.id);
      }

      let allInputs: Array<{
        botId: string;
        conversationId: string;
        title?: string;
        createdAt: string;
        updatedAt: string;
        model?: string;
        answered?: boolean;
        summary?: string;
        sentiment?: string;
        resolved?: string;
        escalated?: string;
        alias?: string;
      }> = [];

      let newestTimestamp = lastSeenTimestamp;

      for (let botId of botIds) {
        let result = await client.listConversations(teamId, botId, {
          perPage: 25
        });

        let conversations = result.conversations;
        if (lastSeenTimestamp) {
          conversations = conversations.filter(c => c.createdAt > lastSeenTimestamp);
        }

        for (let c of conversations) {
          if (!newestTimestamp || c.createdAt > newestTimestamp) {
            newestTimestamp = c.createdAt;
          }
          allInputs.push({
            botId,
            conversationId: c.id,
            title: c.title ?? undefined,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            model: c.model ?? undefined,
            answered: c.answered,
            summary: c.summary ?? undefined,
            sentiment: c.sentiment ?? undefined,
            resolved: c.resolved,
            escalated: c.escalated,
            alias: c.alias
          });
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastSeenTimestamp: newestTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'conversation.created',
        id: ctx.input.conversationId,
        output: {
          conversationId: ctx.input.conversationId,
          botId: ctx.input.botId,
          title: ctx.input.title,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          model: ctx.input.model,
          answered: ctx.input.answered,
          summary: ctx.input.summary,
          sentiment: ctx.input.sentiment,
          resolved: ctx.input.resolved,
          escalated: ctx.input.escalated,
          alias: ctx.input.alias
        }
      };
    }
  })
  .build();
