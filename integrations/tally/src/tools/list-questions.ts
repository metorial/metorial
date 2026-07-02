import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listQuestions = SlateTool.create(spec, {
  name: 'List Form Questions',
  key: 'list_questions',
  description: `List all questions (input blocks) defined on a Tally form. Use this to understand a form's structure before processing submissions, or to map question keys to labels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('The form ID to list questions for')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('The form these questions belong to'),
      questions: z
        .array(
          z.object({
            key: z.string().describe('Unique question key identifier'),
            label: z.string().describe('Human-readable question label'),
            type: z
              .string()
              .describe('Question type (e.g., INPUT_TEXT, INPUT_EMAIL, MULTIPLE_CHOICE)')
          })
        )
        .describe('List of form questions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let questions = await client.listQuestions(ctx.input.formId);

    return {
      output: {
        formId: ctx.input.formId,
        questions
      },
      message: `Found **${questions.length}** question(s) on form **${ctx.input.formId}**.`
    };
  })
  .build();
