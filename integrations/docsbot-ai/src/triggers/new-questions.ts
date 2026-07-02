import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let newQuestions = SlateTrigger.create(spec, {
  name: 'New Questions',
  key: 'new_questions',
  description:
    'Triggers when new questions are asked to a bot. Polls the question history for new entries. Monitors the bot specified in the global config botId, or all bots if not set.'
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID that received the question'),
      questionId: z.string().describe('Unique question identifier'),
      createdAt: z.string().describe('ISO 8601 timestamp of the question'),
      alias: z.string().describe('Anonymous username'),
      question: z.string().describe('User question text'),
      answer: z.string().describe('Bot answer'),
      rating: z.number().describe('Rating value'),
      escalation: z.boolean().describe('Whether support was escalated'),
      couldAnswer: z.boolean().optional().describe('Whether the bot could answer'),
      metadata: z.record(z.string(), z.string()).optional().describe('User metadata')
    })
  )
  .output(
    z.object({
      questionId: z.string().describe('Question identifier'),
      botId: z.string().describe('Bot ID that received the question'),
      createdAt: z.string().describe('ISO 8601 timestamp'),
      alias: z.string().describe('Anonymous username'),
      question: z.string().describe('User question text'),
      answer: z.string().describe('Bot answer in Markdown'),
      rating: z.number().describe('Rating: -1 (negative), 0 (neutral), 1 (positive)'),
      escalation: z.boolean().describe('Whether support was escalated'),
      couldAnswer: z.boolean().optional().describe('Whether the bot could answer'),
      metadata: z.record(z.string(), z.string()).optional().describe('User metadata')
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
        questionId: string;
        createdAt: string;
        alias: string;
        question: string;
        answer: string;
        rating: number;
        escalation: boolean;
        couldAnswer?: boolean;
        metadata?: Record<string, string>;
      }> = [];

      let newestTimestamp = lastSeenTimestamp;

      for (let botId of botIds) {
        let result = await client.listQuestions(teamId, botId, {
          perPage: 50,
          ascending: false
        });

        let questions = result.questions;
        if (lastSeenTimestamp) {
          questions = questions.filter(q => q.createdAt > lastSeenTimestamp);
        }

        for (let q of questions) {
          if (!newestTimestamp || q.createdAt > newestTimestamp) {
            newestTimestamp = q.createdAt;
          }
          allInputs.push({
            botId,
            questionId: q.id,
            createdAt: q.createdAt,
            alias: q.alias,
            question: q.question,
            answer: q.answer,
            rating: q.rating,
            escalation: q.escalation,
            couldAnswer: q.couldAnswer ?? undefined,
            metadata: q.metadata
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
        type: 'question.created',
        id: ctx.input.questionId,
        output: {
          questionId: ctx.input.questionId,
          botId: ctx.input.botId,
          createdAt: ctx.input.createdAt,
          alias: ctx.input.alias,
          question: ctx.input.question,
          answer: ctx.input.answer,
          rating: ctx.input.rating,
          escalation: ctx.input.escalation,
          couldAnswer: ctx.input.couldAnswer,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
