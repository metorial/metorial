import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let postAnswer = SlateTool.create(spec, {
  name: 'Post Answer',
  key: 'post_answer',
  description: `Post an answer to a question on a Stack Exchange site. Requires OAuth with **write_access** scope.`,
  constraints: [
    'Requires authenticated user with write_access scope.',
    'The answer body should follow Stack Exchange formatting guidelines (Markdown/HTML).'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      questionId: z.string().describe('ID of the question to answer'),
      body: z.string().describe('Body of the answer (Markdown/HTML)')
    })
  )
  .output(
    z.object({
      answerId: z.number().describe('ID of the newly created answer'),
      questionId: z.number().describe('ID of the parent question'),
      score: z.number().describe('Initial score of the answer'),
      creationDate: z.string().describe('When the answer was created (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let result = await client.createAnswer(ctx.input.questionId, ctx.input.body);
    let a = result.items[0];

    if (!a) {
      throw new Error('Failed to post answer. Ensure you have write_access scope.');
    }

    return {
      output: {
        answerId: a.answer_id,
        questionId: a.question_id,
        score: a.score ?? 0,
        creationDate: new Date(a.creation_date * 1000).toISOString()
      },
      message: `Posted answer **#${a.answer_id}** to question **#${ctx.input.questionId}**.`
    };
  })
  .build();
