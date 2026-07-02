import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployees = SlateTool.create(spec, {
  name: 'Get Employees',
  key: 'get_employees',
  description: `Retrieve tracking data for all employees in the company. Supports filtering by date and period (day or month). Returns productivity data including productive, neutral, and unproductive time, arrival/departure times, and app/website usage for each employee.`,
  instructions: [
    'Use the period parameter to choose between daily or monthly data. Defaults to a single day.',
    'Date format must be Y-m-d (e.g. 2024-01-15). If omitted, returns data for today.',
    'When period is "month", returns data for the entire month starting from the given date.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z
        .string()
        .optional()
        .describe(
          'Date to retrieve data for (format: Y-m-d, e.g. 2024-01-15). Defaults to today.'
        ),
      period: z
        .enum(['day', 'month'])
        .optional()
        .describe(
          'Period for data retrieval: "day" for a single day, "month" for the full month starting from the given date'
        )
    })
  )
  .output(
    z.object({
      employees: z
        .any()
        .describe(
          'Map of employee IDs to their tracking data including productivity metrics and time breakdowns'
        ),
      rawResponse: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getEmployees({
      date: ctx.input.date,
      period: ctx.input.period
    });

    let employees = response?.employees || response;
    let employeeCount = employees ? Object.keys(employees).length : 0;
    let dateLabel = ctx.input.date || 'today';
    let periodLabel = ctx.input.period || 'day';

    return {
      output: {
        employees,
        rawResponse: response
      },
      message: `Retrieved tracking data for **${employeeCount}** employees for **${dateLabel}** (period: ${periodLabel}).`
    };
  })
  .build();
