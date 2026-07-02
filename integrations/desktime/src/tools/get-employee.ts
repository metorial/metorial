import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve tracking data for a single employee. Look up by employee ID or email address. Returns productivity data including productive, neutral, and unproductive time breakdowns, arrival/departure times, and app/website usage for a given date.`,
  instructions: [
    'Provide either an employeeId or email to look up a specific employee. If neither is provided, returns data for the API key owner.',
    'Date format must be Y-m-d (e.g. 2024-01-15). If omitted, returns data for today.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employeeId: z.string().optional().describe('The employee ID to look up'),
      email: z.string().optional().describe('The employee email address to look up'),
      date: z
        .string()
        .optional()
        .describe(
          'Date to retrieve data for (format: Y-m-d, e.g. 2024-01-15). Defaults to today.'
        )
    })
  )
  .output(
    z.object({
      employee: z
        .any()
        .describe(
          'Employee tracking data including user info, productivity metrics, and time breakdowns'
        ),
      rawResponse: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response: any;
    if (ctx.input.email) {
      response = await client.getEmployeeByEmail(ctx.input.email, ctx.input.date);
    } else {
      response = await client.getEmployee({
        employeeId: ctx.input.employeeId,
        date: ctx.input.date
      });
    }

    let employee = response?.employee || response;

    let employeeName =
      employee?.name || ctx.input.email || ctx.input.employeeId || 'the current user';
    let dateLabel = ctx.input.date || 'today';

    return {
      output: {
        employee,
        rawResponse: response
      },
      message: `Retrieved tracking data for **${employeeName}** on **${dateLabel}**.`
    };
  })
  .build();
