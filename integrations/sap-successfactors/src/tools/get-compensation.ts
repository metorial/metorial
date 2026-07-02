import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompensation = SlateTool.create(spec, {
  name: 'Get Compensation',
  key: 'get_compensation',
  description: `Retrieve employee compensation information from SAP SuccessFactors. Returns compensation records including pay grade, pay group, and related details. Supports effective-dated queries for historical compensation data.`,
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
      top: z.number().optional().describe('Maximum records to return').default(100),
      skip: z.number().optional().describe('Number of records to skip'),
      orderBy: z.string().optional().describe('Sort order (e.g., "startDate desc")')
    })
  )
  .output(
    z.object({
      compensationRecords: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of compensation records'),
      totalCount: z.number().optional().describe('Total count of matching records')
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

    let result = await client.queryCompensationInfo({
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
        compensationRecords: result.results,
        totalCount: result.count
      },
      message: `Retrieved **${result.results.length}** compensation records${ctx.input.userId ? ` for user ${ctx.input.userId}` : ''}`
    };
  })
  .build();
