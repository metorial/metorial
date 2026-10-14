import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getEmployeeRecord } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve tracking data for a single employee. Look up by employee ID or email address. Returns productivity data including productive, neutral, and unproductive time breakdowns, arrival/departure times, and app/website usage for a given date.`,
  instructions: [
    'Provide either an employeeId or email to look up a specific employee, never both. If neither is provided, returns data for the API key owner. Call get_employees to discover employee IDs.',
    'Date format must be Y-m-d (e.g. 2024-01-15). If omitted, returns data for today.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employeeId: z
        .string()
        .optional()
        .describe('The employee ID to look up. Call get_employees to discover IDs.'),
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
    if (ctx.input.employeeId !== undefined && ctx.input.email !== undefined) {
      throw createApiServiceError('Provide either employeeId or email, never both.');
    }
    let client = new Client({ token: ctx.auth.token });

    let response: unknown;
    if (ctx.input.email !== undefined) {
      response = await client.getEmployeeByEmail(ctx.input.email, ctx.input.date);
    } else {
      response = await client.getEmployee({
        employeeId: ctx.input.employeeId,
        date: ctx.input.date
      });
    }

    let employee = getEmployeeRecord(response);

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
