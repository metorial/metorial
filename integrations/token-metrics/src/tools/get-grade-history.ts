import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getRecords } from '../lib/client';
import { spec } from '../spec';

export let getGradeHistory = SlateTool.create(spec, {
  name: 'Get Grade History',
  key: 'get_grade_history',
  description:
    'Retrieve historical TM, technology, or fundamental grades with the original component scores and dates. Call search_tokens to discover Token Metrics IDs and slugs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      gradeType: z
        .enum(['tm', 'technology', 'fundamental'])
        .describe('Grade family to retrieve'),
      tokenId: z
        .string()
        .optional()
        .describe('Comma-separated Token Metrics IDs from search_tokens'),
      tokenName: z.string().optional().describe('Comma-separated token names'),
      symbol: z.string().optional().describe('Comma-separated token symbols'),
      slug: z.string().optional().describe('Comma-separated token slugs from search_tokens'),
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format'),
      limit: z.number().int().positive().optional().describe('Results per page (default: 50)'),
      page: z.number().int().positive().optional().describe('Page number (default: 1)')
    })
  )
  .output(
    z.object({
      grades: z
        .array(z.record(z.string(), z.any()))
        .describe('Actual historical grade records returned by the provider'),
      raw: z
        .record(z.string(), z.any())
        .describe('Complete provider response with pagination and original null values')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getGradeHistory(
      ctx.input.gradeType,
      ctx.input
    );
    let grades = getRecords(result);
    return {
      output: { grades, raw: result },
      message: `Retrieved **${grades.length}** historical ${ctx.input.gradeType} grade record(s).`
    };
  })
  .build();
