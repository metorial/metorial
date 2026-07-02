import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contextualAnswer = SlateTool.create(spec, {
  name: 'Contextual Answer',
  key: 'contextual_answer',
  description: `Answer a question based on a provided context document. Returns an answer only if it can be found in the context, preventing hallucination. Returns null if the answer is not in the context.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      context: z.string().describe('Context document or text to search for the answer'),
      question: z.string().describe('Question to answer from the context')
    })
  )
  .output(
    z.object({
      answerId: z.string().optional().describe('Unique identifier for this answer request'),
      answer: z
        .string()
        .optional()
        .describe('The answer found in the context, or null if not found'),
      answerFound: z.boolean().describe('Whether an answer was found in the context')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.contextualAnswer({
      context: ctx.input.context,
      question: ctx.input.question
    });

    let answer = result.answer ?? null;

    return {
      output: {
        answerId: result.id,
        answer: answer ?? undefined,
        answerFound: answer !== null
      },
      message: answer
        ? `Answer found:\n\n> ${answer}`
        : 'No answer could be found in the provided context.'
    };
  })
  .build();
