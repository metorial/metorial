import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let countEmployees = (employees: unknown): number | undefined => {
  let ids = new Set<string>();
  let addEmployee = (employee: unknown, fallbackId?: string): boolean => {
    if (!isApiErrorRecord(employee)) return false;
    let id = employee.id ?? fallbackId;
    if (typeof id !== 'string' && typeof id !== 'number') return false;
    ids.add(String(id));
    return true;
  };

  if (Array.isArray(employees)) {
    return employees.every(employee => addEmployee(employee)) ? ids.size : undefined;
  }
  if (!isApiErrorRecord(employees)) return undefined;

  for (let [key, value] of Object.entries(employees)) {
    if (key.startsWith('__')) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      if (!isApiErrorRecord(value)) return undefined;
      for (let [employeeId, employee] of Object.entries(value)) {
        if (employeeId.startsWith('__')) continue;
        if (!addEmployee(employee, employeeId)) return undefined;
      }
    } else if (!addEmployee(value, key)) {
      return undefined;
    }
  }
  return ids.size;
};

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
          'Tracking data grouped by date and employee ID, including productivity metrics and time breakdowns. Employee IDs can be used with get_employee and get_employee_projects.'
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

    let employees =
      isApiErrorRecord(response) && response.employees !== undefined
        ? response.employees
        : response;
    if (!Array.isArray(employees) && !isApiErrorRecord(employees)) {
      throw createApiServiceError('DeskTime returned an invalid employees response.', {
        reason: 'desktime_invalid_response'
      });
    }
    let employeeCount = countEmployees(employees);
    let dateLabel = ctx.input.date || 'today';
    let periodLabel = ctx.input.period || 'day';

    return {
      output: {
        employees,
        rawResponse: response
      },
      message:
        employeeCount === undefined
          ? `Retrieved employee tracking data for **${dateLabel}** (period: ${periodLabel}).`
          : `Retrieved tracking data for **${employeeCount}** employees for **${dateLabel}** (period: ${periodLabel}).`
    };
  })
  .build();
