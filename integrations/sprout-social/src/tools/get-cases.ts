import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCases = SlateTool.create(spec, {
  name: 'Get Cases',
  key: 'get_cases',
  description: `Retrieve customer care cases from Sprout Social. Cases represent customer inquiries, issues, or engagements that may require action by a social care agent. Filter by creation time, status, priority, type, queue, assigned user, and tags.`,
  instructions: [
    'Filter format examples: "status.eq(OPEN)", "priority.eq(HIGH)", "type.eq(SUPPORT)".',
    'Status values: OPEN, ON_HOLD, CLOSED.',
    'Priority values: LOW, MEDIUM, HIGH, URGENT.',
    'Type values: GENERAL, SUPPORT, LEAD, QUESTION, FEEDBACK.',
    'Date filter ranges are limited to one week maximum.'
  ],
  constraints: ['Date filter ranges must not exceed one week.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filters: z
        .array(z.string())
        .describe(
          'Array of filter expressions (e.g., "status.eq(OPEN)", "created_time.in(2024-01-01..2024-01-07)").'
        ),
      fields: z.array(z.string()).optional().describe('Fields to return in the response.'),
      sort: z.array(z.string()).optional().describe('Sort order for results.'),
      page: z.number().optional().describe('Page number for pagination (1-indexed).'),
      limit: z.number().optional().describe('Results per page.')
    })
  )
  .output(
    z.object({
      cases: z.array(z.any()).describe('Array of case objects.'),
      paging: z
        .object({
          currentPage: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
        .describe('Pagination information.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId
    });

    let result = await client.getCases({
      filters: ctx.input.filters,
      fields: ctx.input.fields,
      sort: ctx.input.sort,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let cases = result?.data ?? [];
    let paging = result?.paging
      ? {
          currentPage: result.paging.current_page,
          totalPages: result.paging.total_pages
        }
      : undefined;

    return {
      output: { cases, paging },
      message: `Retrieved **${cases.length}** cases from Sprout Social.`
    };
  });
