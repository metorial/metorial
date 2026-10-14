import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { botIdSchema, workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listStarterPresets = SlateTool.create(spec, {
  name: 'List Starter Presets',
  key: 'list_starter_presets',
  description:
    'Retrieve the bot welcome message and starter questions shown at the beginning of a conversation. For account connections, call list_bots first and provide botId.',
  tags: { readOnly: true }
})
  .input(z.object({ botId: botIdSchema, workspaceId: workspaceIdSchema }))
  .output(
    z.object({
      welcomeMessage: z.string().describe('Welcome message configured for the bot'),
      starterQuestions: z
        .array(
          z.object({
            starterQuestionId: z.string(),
            botId: z.string(),
            question: z.string(),
            answer: z.string(),
            order: z.number(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
        )
        .describe('Starter questions configured for the bot')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(
      ctx.auth.token,
      ctx.auth.credentialType,
      ctx.input.botId,
      ctx.input.workspaceId
    );
    let result = await client.listStarterPresets();
    return {
      output: {
        welcomeMessage: result.welcome_message,
        starterQuestions: result.starter_questions.map(question => ({
          starterQuestionId: question.id,
          botId: question.bot_id,
          question: question.question,
          answer: question.answer,
          order: question.order,
          createdAt: question.created_at,
          updatedAt: question.updated_at
        }))
      },
      message: `Retrieved ${result.starter_questions.length} starter questions and the welcome message.`
    };
  })
  .build();
