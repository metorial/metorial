import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobInfo = SlateTool.create(spec, {
  name: 'Get Job Information',
  key: 'get_job_info',
  description: `Retrieve job information records for employees. Returns employment details such as department, position, job title, location, manager, and compensation grade. Supports querying current or historical (effective-dated) job information.`,
  instructions: [
    'Filter by userId to get job info for a specific employee',
    'Job info is effective-dated; filter by startDate to get records for a specific date range',
    'Use expand to include related navigation properties like "positionNav" or "departmentNav"'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Filter by specific employee user ID'),
      filter: z.string().optional().describe('OData $filter expression for advanced queries'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      expand: z.string().optional().describe('Navigation properties to expand'),
      top: z.number().optional().describe('Maximum number of records to return').default(100),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      orderBy: z.string().optional().describe('Sort order (e.g., "startDate desc")')
    })
  )
  .output(
    z.object({
      jobRecords: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of job information records'),
      totalCount: z.number().optional().describe('Total count if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let filterParts: string[] = [];
    if (ctx.input.userId) {
      filterParts.push(`userId eq '${ctx.input.userId}'`);
    }
    if (ctx.input.filter) {
      filterParts.push(ctx.input.filter);
    }

    let result = await client.queryJobInfo({
      filter: filterParts.length > 0 ? filterParts.join(' and ') : undefined,
      select: ctx.input.select,
      expand: ctx.input.expand,
      top: ctx.input.top,
      skip: ctx.input.skip,
      orderBy: ctx.input.orderBy,
      inlineCount: true
    });

    return {
      output: {
        jobRecords: result.results,
        totalCount: result.count
      },
      message: `Retrieved **${result.results.length}** job info records${ctx.input.userId ? ` for user ${ctx.input.userId}` : ''}`
    };
  })
  .build();
