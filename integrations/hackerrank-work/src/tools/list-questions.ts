import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listQuestions = SlateTool.create(spec, {
  name: 'List Questions',
  key: 'list_questions',
  description: `List questions from your HackerRank question library. Optionally filter by question type (coding, multiple choice, project, database). Returns question metadata including title, type, difficulty, and tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .string()
        .optional()
        .describe('Filter by question type (e.g., "coding", "mcq", "project", "database")'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of questions to return (1-100, default 100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      questions: z.array(z.record(z.string(), z.any())).describe('Array of question objects'),
      total: z.number().describe('Total number of questions available'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listQuestions({
      type: ctx.input.type,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        questions: result.data,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${result.total}** questions${ctx.input.type ? ` of type "${ctx.input.type}"` : ''} (showing ${result.data.length}).`
    };
  });
