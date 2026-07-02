import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTimeOff = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description: `Search time-off records or create new time-off requests in SAP SuccessFactors. Can query existing time-off entries by employee, date range, status, or time type, and submit new absence requests.`,
  instructions: [
    'When creating a time-off, userId, timeType, startDate, and endDate are required',
    "Filter examples: \"userId eq 'user1' and approvalStatus eq 'APPROVED'\""
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['search', 'create'])
        .describe('Whether to search existing time-off records or create a new request'),
      filter: z.string().optional().describe('OData $filter expression (for search)'),
      select: z.string().optional().describe('Comma-separated fields to return (for search)'),
      top: z
        .number()
        .optional()
        .describe('Maximum records to return (for search)')
        .default(100),
      skip: z.number().optional().describe('Number of records to skip (for search)'),
      userId: z.string().optional().describe('Employee user ID (for create)'),
      timeType: z.string().optional().describe('Time-off type code (for create)'),
      startDate: z
        .string()
        .optional()
        .describe('Start date in YYYY-MM-DD format (for create)'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format (for create)'),
      quantityInDays: z.number().optional().describe('Duration in days (for create)'),
      comment: z.string().optional().describe('Optional comment for the request (for create)')
    })
  )
  .output(
    z.object({
      timeOffRecords: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of time-off records (for search)'),
      createdRecord: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The newly created time-off record (for create)'),
      totalCount: z
        .number()
        .optional()
        .describe('Total count of matching records (for search)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    if (ctx.input.operation === 'create') {
      if (
        !ctx.input.userId ||
        !ctx.input.timeType ||
        !ctx.input.startDate ||
        !ctx.input.endDate
      ) {
        throw new Error(
          'userId, timeType, startDate, and endDate are required for creating a time-off request'
        );
      }

      let data: Record<string, unknown> = {
        userId: ctx.input.userId,
        timeType: ctx.input.timeType,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate
      };
      if (ctx.input.quantityInDays !== undefined)
        data.quantityInDays = ctx.input.quantityInDays;
      if (ctx.input.comment) data.comment = ctx.input.comment;

      let createdRecord = await client.createTimeOff(data);
      return {
        output: { createdRecord },
        message: `Created time-off request for **${ctx.input.userId}** from ${ctx.input.startDate} to ${ctx.input.endDate}`
      };
    }

    let result = await client.queryTimeOff({
      filter: ctx.input.filter,
      select: ctx.input.select,
      top: ctx.input.top,
      skip: ctx.input.skip,
      inlineCount: true
    });

    return {
      output: {
        timeOffRecords: result.results,
        totalCount: result.count
      },
      message: `Found **${result.results.length}** time-off records`
    };
  })
  .build();
