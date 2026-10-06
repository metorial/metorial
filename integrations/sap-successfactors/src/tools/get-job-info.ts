import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { userFilter } from '../lib/helpers';
import { spec } from '../spec';

export let getJobInfo = SlateTool.create(spec, {
  name: 'Get Job Information',
  key: 'get_job_info',
  description: `Retrieve job information records for employees. Returns employment details such as department, position, job title, location, manager, and compensation grade. Supports querying current or historical (effective-dated) job information.`,
  instructions: [
    'Filter by userId to get job info for a specific employee',
    'Use asOfDate or fromDate/toDate for effective-dated history; filtering startDate alone does not change SAP’s default effective-date selection',
    'Use expand to include related navigation properties like "positionNav" or "departmentNav"'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Filter by specific employee user ID'),
      asOfDate: z
        .string()
        .optional()
        .describe(
          'Effective date in YYYY-MM-DD. Without a date range SAP normally returns records effective today.'
        ),
      fromDate: z
        .string()
        .optional()
        .describe('Start of effective-date range; cannot combine with asOfDate.'),
      toDate: z
        .string()
        .optional()
        .describe('End of effective-date range; cannot combine with asOfDate.'),
      filter: z.string().optional().describe('OData $filter expression for advanced queries'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z.string().optional().describe('Navigation properties to expand'),
      top: z.number().optional().describe('Maximum number of records to return').default(100),
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Keep the entity and original query unchanged; do not combine with skip.'
        ),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      orderBy: z.string().optional().describe('Sort order (e.g., "startDate desc")')
    })
  )
  .output(
    z.object({
      jobRecords: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of job information records'),
      nextLink: z
        .string()
        .optional()
        .describe(
          'Exact provider continuation URL; pass it as nextPage to retrieve the next page.'
        ),
      hasMore: z.boolean().optional().describe('Whether SAP returned another page.'),
      totalCount: z.number().optional().describe('Total count if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let result = await client.queryJobInfo({
      asOfDate: ctx.input.asOfDate,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      filter: userFilter(ctx.input.userId, ctx.input.filter),
      select: ctx.input.select,
      expand: ctx.input.expand,
      top: ctx.input.top,
      skip: ctx.input.skip,
      nextPage: ctx.input.nextPage,
      orderBy: ctx.input.orderBy,
      inlineCount: true
    });

    return {
      output: {
        jobRecords: result.results,
        totalCount: result.count,
        nextLink: result.nextLink,
        hasMore: result.hasMore
      },
      message: `Retrieved **${result.results.length}** job info records`
    };
  })
  .build();
