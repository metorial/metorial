import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateQuestion = SlateTool.create(spec, {
  key: 'update_question',
  name: 'Update Question',
  description:
    'Change the text or external identifier of a data collection question. The existing question type cannot be changed.'
})
  .input(
    z.object({
      questionId: z
        .string()
        .describe('Question ID. Call list_questions to discover questions.'),
      text: z
        .string()
        .describe('Question text. Send the current text if only changing externalId.'),
      externalId: z
        .string()
        .optional()
        .describe(
          'Your identifier, containing only letters, numbers, underscores, and hyphens.'
        )
    })
  )
  .output(z.object({ questionId: z.string() }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth.token).updateQuestion(
      ctx.input.questionId,
      ctx.input.text,
      ctx.input.externalId
    );
    return {
      output: { questionId: ctx.input.questionId },
      message: `Updated question **${ctx.input.questionId}**.`
    };
  })
  .build();
