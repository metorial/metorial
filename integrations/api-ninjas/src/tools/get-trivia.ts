import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTrivia = SlateTool.create(spec, {
  name: 'Get Trivia',
  key: 'get_trivia',
  description: `Retrieve random trivia questions with answers. Optionally filter by category such as science, history, geography, entertainment, sports, music, mathematics, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      category: z
        .enum([
          'artliterature',
          'language',
          'sciencenature',
          'general',
          'fooddrink',
          'peopleplaces',
          'geography',
          'historyholidays',
          'entertainment',
          'toysgames',
          'music',
          'mathematics',
          'religionmythology',
          'sportsleisure'
        ])
        .optional()
        .describe('Trivia category to filter by')
    })
  )
  .output(
    z.object({
      questions: z
        .array(
          z.object({
            category: z.string().optional().describe('Trivia category'),
            question: z.string().describe('The trivia question'),
            answer: z.string().describe('The answer')
          })
        )
        .describe('List of trivia questions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number> = {};
    if (ctx.input.category) params.category = ctx.input.category;

    let result = await client.getTrivia(params);
    let questions = Array.isArray(result) ? result : [result];

    return {
      output: {
        questions: questions.map((q: any) => ({
          category: q.category,
          question: q.question,
          answer: q.answer
        }))
      },
      message:
        questions.length > 0
          ? `**Q:** ${questions[0].question}\n**A:** ||${questions[0].answer}||`
          : 'No trivia questions found.'
    };
  })
  .build();
