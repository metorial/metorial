import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let acceptAnswer = SlateTool.create(spec, {
  key: 'accept_answer',
  name: 'Accept Answer',
  description:
    'Accept an answer to your question, or undo acceptance. Requires OAuth with write_access. Undo an existing accepted answer before accepting another.',
  tags: { destructive: true }
})
  .input(
    z.object({
      answerId: z.string().describe('Answer ID'),
      undo: z
        .boolean()
        .optional()
        .default(false)
        .describe('Undo acceptance instead of accepting the answer')
    })
  )
  .output(z.object({ answerId: z.number(), questionId: z.number(), isAccepted: z.boolean() }))
  .handleInvocation(async ctx => {
    let result = await new Client({ ...ctx.auth, site: ctx.config.site }).acceptAnswer(
      ctx.input.answerId,
      ctx.input.undo
    );
    let answer = result.items[0];
    if (!answer)
      throw createApiServiceError(
        'Stack Exchange did not return the answer acceptance state.'
      );
    return {
      output: {
        answerId: answer.answer_id,
        questionId: answer.question_id,
        isAccepted: answer.is_accepted
      },
      message: `Answer #${answer.answer_id} is ${answer.is_accepted ? 'accepted' : 'not accepted'}.`
    };
  })
  .build();
