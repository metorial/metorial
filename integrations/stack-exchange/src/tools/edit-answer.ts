import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { providerDate } from '../lib/response';
import { spec } from '../spec';

export let editAnswer = SlateTool.create(spec, {
  key: 'edit_answer',
  name: 'Edit Answer',
  description:
    'Edit the body of an answer. Requires OAuth with write_access and permission to edit the answer.',
  tags: { destructive: true }
})
  .input(
    z.object({
      answerId: z.string().describe('ID of the answer to edit'),
      body: z.string().describe('Complete replacement body in Markdown')
    })
  )
  .output(
    z.object({
      answerId: z.number(),
      questionId: z.number(),
      score: z.number(),
      creationDate: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ ...ctx.auth, site: ctx.config.site }).editAnswer(
      ctx.input.answerId,
      ctx.input.body
    );
    let answer = result.items[0];
    if (!answer)
      throw createApiServiceError('Stack Exchange did not return the edited answer.');
    return {
      output: {
        answerId: answer.answer_id,
        questionId: answer.question_id,
        score: answer.score,
        creationDate: providerDate(answer.creation_date)
      },
      message: `Edited answer #${answer.answer_id}.`
    };
  })
  .build();
