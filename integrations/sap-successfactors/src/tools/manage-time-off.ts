import { randomUUID } from 'node:crypto';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { dateOnly, invalid } from '../lib/helpers';
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
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Keep the entity and original query unchanged; do not combine with skip.'
        ),
      skip: z.number().optional().describe('Number of records to skip (for search)'),
      externalCode: z
        .string()
        .optional()
        .describe(
          'Unique request key for create. Omit to generate a UUID, returned in the created record and recoverable error metadata.'
        ),
      workflowConfirmed: z
        .boolean()
        .optional()
        .describe(
          'For create, explicitly set true only after reviewing applicable approval workflows. Required to submit the request.'
        ),
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
      nextLink: z
        .string()
        .optional()
        .describe(
          'Exact provider continuation URL; pass it as nextPage to retrieve the next page.'
        ),
      hasMore: z.boolean().optional().describe('Whether SAP returned another page.'),
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
        throw invalid(
          'userId, timeType, startDate, and endDate are required for creating a time-off request'
        );
      }

      if (ctx.input.workflowConfirmed !== true)
        throw invalid(
          'Set workflowConfirmed to true only after reviewing SAP approval workflow behavior.'
        );
      if (
        ctx.input.filter !== undefined ||
        ctx.input.select !== undefined ||
        ctx.input.skip !== undefined ||
        ctx.input.nextPage !== undefined ||
        ctx.input.top !== 100
      )
        throw invalid('Do not combine create with search filters or pagination.');
      if (dateOnly(ctx.input.startDate) > dateOnly(ctx.input.endDate))
        throw invalid('startDate must not be after endDate.');
      let data: Record<string, unknown> = {
        externalCode: ctx.input.externalCode ?? randomUUID(),
        userId: ctx.input.userId,
        timeType: ctx.input.timeType,
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate
      };
      if (ctx.input.quantityInDays !== undefined) {
        if (
          !Number.isFinite(ctx.input.quantityInDays) ||
          ctx.input.quantityInDays <= 0 ||
          !Number.isSafeInteger(ctx.input.quantityInDays)
        )
          throw invalid(
            'quantityInDays must be a positive whole number. Use SAP’s documented decimal-string API for fractional days.'
          );
        data.quantityInDays = String(ctx.input.quantityInDays);
      }
      if (ctx.input.comment !== undefined) data.comment = ctx.input.comment;

      let createdRecord = await client.createTimeOff(data, true);
      return {
        output: { createdRecord },
        message:
          'Submitted and read back the time-off request. Its approval status follows SAP’s configured workflow.'
      };
    }

    if (
      [
        ctx.input.userId,
        ctx.input.timeType,
        ctx.input.startDate,
        ctx.input.endDate,
        ctx.input.quantityInDays,
        ctx.input.comment,
        ctx.input.externalCode,
        ctx.input.workflowConfirmed
      ].some(v => v !== undefined)
    )
      throw invalid(
        'Create-only fields cannot be used in a search; use filter for search criteria.'
      );
    let result = await client.queryTimeOff({
      filter: ctx.input.filter,
      select: ctx.input.select,
      top: ctx.input.top,
      skip: ctx.input.skip,
      nextPage: ctx.input.nextPage,
      inlineCount: true
    });

    return {
      output: {
        timeOffRecords: result.results,
        totalCount: result.count,
        nextLink: result.nextLink,
        hasMore: result.hasMore
      },
      message: `Found **${result.results.length}** time-off records`
    };
  })
  .build();
