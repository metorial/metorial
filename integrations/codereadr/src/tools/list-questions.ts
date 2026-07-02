import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listQuestions = SlateTool.create(spec, {
  name: 'List Questions',
  key: 'list_questions',
  description: `Retrieve data collection questions from your CodeREADr account. Questions are prompts presented to app users alongside scans, supporting input types like text, dropdowns, photos, GPS, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      questionId: z
        .string()
        .optional()
        .describe('Specific question ID to retrieve. Leave empty to retrieve all questions.')
    })
  )
  .output(
    z.object({
      questions: z
        .array(
          z
            .object({
              questionId: z.string().describe('Unique ID of the question'),
              text: z.string().optional().describe('Question text'),
              type: z
                .string()
                .optional()
                .describe(
                  'Question type (manual, manualnumeric, option, checkbox, dropdown, gps, etc.)'
                ),
              answers: z
                .array(
                  z.object({
                    answerId: z.string(),
                    answerText: z.string()
                  })
                )
                .optional()
                .describe('Predefined answer options')
            })
            .passthrough()
        )
        .describe('List of questions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let questions = await client.retrieveQuestions(ctx.input.questionId);

    return {
      output: { questions },
      message: ctx.input.questionId
        ? `Retrieved question **${ctx.input.questionId}**.`
        : `Retrieved **${questions.length}** question(s).`
    };
  })
  .build();
