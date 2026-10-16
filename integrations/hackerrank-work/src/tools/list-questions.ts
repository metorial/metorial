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
      status: z.enum(['active', 'archived']).optional().describe('Question status'),
      access: z
        .string()
        .optional()
        .describe('Comma-separated access values: library, owned, shared'),
      difficulty: z.string().optional().describe('Comma-separated difficulty levels'),
      owner: z
        .string()
        .optional()
        .describe('Comma-separated owner user IDs; call list_users to discover IDs'),
      tags: z.string().optional().describe('Comma-separated question tags'),
      skills: z.string().optional().describe('Comma-separated question skills'),
      languages: z.string().optional().describe('Comma-separated programming languages'),
      type: z
        .string()
        .optional()
        .describe('Filter by question type (e.g., "code", "mcq", "database")'),
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
      next: z
        .string()
        .optional()
        .describe('Provider URL for the next page, empty when no next page exists'),
      previous: z.string().optional().describe('Provider URL for the previous page'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response including pagination'),
      total: z.number().describe('Total number of questions available'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listQuestions({
      ...ctx.input,
      type: ctx.input.type,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        questions: result.data,
        next: result.next,
        previous: result.previous,
        raw: result.raw,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${result.total}** questions${ctx.input.type ? ` of type "${ctx.input.type}"` : ''} (showing ${result.data.length}).`
    };
  });
