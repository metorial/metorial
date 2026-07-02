import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      absences: z.array(z.record(z.string(), z.any())).describe('List of absence records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listAbsences({
      type: ctx.input.type,
      employeeId: ctx.input.employeeId,
      departmentId: ctx.input.departmentId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      excludeCancelledAbsences: ctx.input.excludeCancelledAbsences,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let absences = result?.absences || [];

    return {
      output: { absences },
      message: `Retrieved **${absences.length}** absence record(s).`
    };
  })
  .build();
