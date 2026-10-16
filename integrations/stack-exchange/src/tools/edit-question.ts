import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let editQuestion = SlateTool.create(spec, {
  key: 'edit_question',
  name: 'Edit Question',
  description:
    'Edit a question title, body, and tags. Requires OAuth with write_access and permission to edit the question.',
  tags: { destructive: true }
})
  .input(
    z.object({
      questionId: z.string().describe('ID of the question to edit'),
      title: z.string().describe('Complete replacement title'),
      body: z.string().describe('Complete replacement body in Markdown'),
      tags: z.array(z.string()).min(1).describe('Complete replacement list of tags')
    })
  )
  .output(z.object({ questionId: z.number(), title: z.string(), link: z.string() }))
  .handleInvocation(async ctx => {
    let result = await new Client({ ...ctx.auth, site: ctx.config.site }).editQuestion(
      ctx.input.questionId,
      ctx.input.title,
      ctx.input.body,
      ctx.input.tags
    );
    let question = result.items[0];
    if (!question)
      throw createApiServiceError('Stack Exchange did not return the edited question.');
    return {
      output: { questionId: question.question_id, title: question.title, link: question.link },
      message: `Edited question #${question.question_id}.`
    };
  })
  .build();
