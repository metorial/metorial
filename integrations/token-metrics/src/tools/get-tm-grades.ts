import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getRecords } from '../lib/client';
import { spec } from '../spec';

export let getTmGrades = SlateTool.create(spec, {
  name: 'Get TM Grades',
  key: 'get_tm_grades',
  description:
    'Retrieve the current TM Grade, quantitative grade, trading signals, momentum, and grade changes for supported tokens. Call search_tokens to discover Token Metrics IDs and slugs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      tokenId: z
        .string()
        .optional()
        .describe('Comma-separated Token Metrics IDs from search_tokens'),
      tokenName: z.string().optional().describe('Comma-separated token names'),
      symbol: z.string().optional().describe('Comma-separated token symbols'),
      slug: z.string().optional().describe('Comma-separated token slugs from search_tokens'),
      limit: z.number().int().positive().optional().describe('Results per page (default: 50)'),
      page: z.number().int().positive().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      grades: z
        .array(z.record(z.string(), z.any()))
        .describe('Actual TM Grade records returned by the provider'),
      raw: z
        .record(z.string(), z.any())
        .describe('Complete provider response with pagination and original null values')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getTmGrades(ctx.input);
    let grades = getRecords(result);
    return {
      output: { grades, raw: result },
      message: `Retrieved **${grades.length}** TM Grade record(s).`
    };
  })
  .build();
