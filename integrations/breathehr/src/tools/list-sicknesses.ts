import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  dateRange,
  pageParams,
  paginationSchema,
  readRows,
  requireDate
} from '../lib/response';
import { spec } from '../spec';

export let listSicknesses = SlateTool.create(spec, {
  name: 'List Sicknesses',
  key: 'list_sicknesses',
  description: `Retrieve sickness records from Breathe HR. Filter by employee, department, or date range. Returns sickness details including type, dates, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employeeId: z.string().optional().describe('Filter by employee ID'),
      departmentId: z.string().optional().describe('Filter by department ID'),
      startDate: z
        .string()
        .optional()
        .describe('Filter sicknesses starting from this date (format: YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter sicknesses ending before this date (format: YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema.optional(),
      sicknesses: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of sickness records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    const startDate =
      ctx.input.startDate === undefined
        ? undefined
        : requireDate(ctx.input.startDate, 'startDate');
    const endDate =
      ctx.input.endDate === undefined ? undefined : requireDate(ctx.input.endDate, 'endDate');
    if (startDate) dateRange(startDate, endDate);
    const result = await client.list(
      'sicknesses',
      {
        ...pageParams(ctx.input, true),
        employee_id: ctx.input.employeeId,
        department_id: ctx.input.departmentId,
        start_date: startDate,
        end_date: endDate
      },
      true
    );
    const sicknesses = readRows(result, 'sicknesses');
    return {
      output: { sicknesses, pagination: result.pagination },
      message: `Retrieved **${sicknesses.length}** sickness record(s).`
    };
  })
  .build();
