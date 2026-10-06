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

export let listAbsences = SlateTool.create(spec, {
  name: 'List Absences',
  key: 'list_absences',
  description: `Retrieve absence records from Breathe HR. Filter by absence type, employee, department, or date range. Returns holiday and other leave records with approval status and dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z.string().optional().describe('Filter by absence type'),
      employeeId: z.string().optional().describe('Filter by employee ID'),
      departmentId: z.string().optional().describe('Filter by department ID'),
      startDate: z
        .string()
        .optional()
        .describe('Filter absences starting from this date (format: YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter absences ending before this date (format: YYYY-MM-DD)'),
      excludeCancelledAbsences: z
        .boolean()
        .optional()
        .describe('Exclude cancelled absence requests'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema.optional(),
      absences: z.array(z.record(z.string(), z.unknown())).describe('List of absence records')
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
      'absences',
      {
        ...pageParams(ctx.input, true),
        employee_id: ctx.input.employeeId,
        department_id: ctx.input.departmentId,
        start_date: startDate,
        end_date: endDate,
        type: ctx.input.type,
        exclude_cancelled_absences: ctx.input.excludeCancelledAbsences
      },
      true
    );
    const absences = readRows(result, 'absences');
    return {
      output: { absences, pagination: result.pagination },
      message: `Retrieved **${absences.length}** absence record(s).`
    };
  })
  .build();
