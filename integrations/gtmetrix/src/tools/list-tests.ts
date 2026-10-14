import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { testOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listTests = SlateTool.create(spec, {
  name: 'List Tests',
  key: 'list_tests',
  description:
    'Lists recent GTmetrix tests with status and report IDs. Supports filtering by state and source, sorting, and pagination to recover queued tests and retrieve completed reports.',
  constraints: ['Tests are retained for 24 hours. API tests are returned by default.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      state: z
        .enum(['queued', 'started', 'completed', 'error'])
        .optional()
        .describe('Filter by test state'),
      source: z
        .enum(['api', 'on-demand', 'monitored'])
        .optional()
        .describe('Filter by test source; default is api'),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort by created, started, or finished; prefix with - for descending. Multiple fields may be comma separated.'
        ),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Results per page, 1-500; default 50'),
      pageNumber: z.number().int().min(1).optional().describe('Page number, starting at 1')
    })
  )
  .output(
    z.object({
      tests: z.array(testOutputSchema),
      currentPage: z.number(),
      hasNextPage: z.boolean(),
      hasPrevPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listTests(ctx.input);
    return {
      output: {
        tests: result.items,
        currentPage: result.currentPage,
        hasNextPage: !!result.nextPage,
        hasPrevPage: !!result.prevPage
      },
      message: `Found **${result.items.length}** test(s) on page ${result.currentPage}.`
    };
  })
  .build();
