import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCalendar = SlateTool.create(spec, {
  key: 'get_calendar',
  name: 'Get Calendar',
  description:
    'Get TalentHR employee absences and holidays for a date range. Results include pending and approved time off, and may include terminated employees. Use filter to narrow status or organizational groups. If endDate is omitted, TalentHR uses the end of the start month.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      startDate: z.string().describe('Start date in YYYY-MM-DD or YYYY-MM format'),
      endDate: z
        .string()
        .optional()
        .describe('End date in YYYY-MM-DD format, at most two years after the start'),
      employeeId: z.string().optional().describe('Employee ID from list_employees'),
      filter: z
        .string()
        .optional()
        .describe(
          'Calendar filter string, for example department=10;time_off=pending,approved;'
        )
    })
  )
  .output(
    z.object({
      employees: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Employee calendar records, including holidays and time_off_request details'
        ),
      count: z.number().describe('Number of employee calendar records returned'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    const response = await new Client({ token: ctx.auth.token }).getCalendar({
      start_date: ctx.input.startDate,
      end_date: ctx.input.endDate,
      employee_id: ctx.input.employeeId,
      filter: ctx.input.filter
    });
    return {
      output: {
        employees: response.data.employees,
        count: response.data.employees.length,
        rawResponse: response
      },
      message: `Retrieved calendar data for ${response.data.employees.length} employee(s).`
    };
  })
  .build();
