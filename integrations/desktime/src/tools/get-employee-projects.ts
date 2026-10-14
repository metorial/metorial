import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getEmployeeRecord } from '../lib/client';
import { spec } from '../spec';

export let getEmployeeProjects = SlateTool.create(spec, {
  name: 'Get Employee Projects',
  key: 'get_employee_projects',
  description:
    "Retrieve an employee's tracked project activity and productivity data for a date. Call get_employees to discover employee IDs, or omit employeeId to retrieve the API key owner's data.",
  tags: { readOnly: true }
})
  .input(
    z.object({
      employeeId: z
        .string()
        .optional()
        .describe(
          'Employee ID. Call get_employees to discover IDs. Defaults to the connected user.'
        ),
      date: z.string().optional().describe('Date in YYYY-MM-DD format. Defaults to today.')
    })
  )
  .output(
    z.object({
      employee: z
        .record(z.string(), z.unknown())
        .describe('Employee information, tracking data, and tracked projects'),
      projects: z.any().optional().describe('Tracked projects when returned by DeskTime'),
      rawResponse: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client({ token: ctx.auth.token }).getEmployeeProjects(ctx.input);
    let employee = getEmployeeRecord(response);
    return {
      output: { employee, projects: employee.projects, rawResponse: response },
      message: `Retrieved project activity for **${employee.name || ctx.input.employeeId || 'the connected user'}** on **${ctx.input.date || 'today'}**.`
    };
  })
  .build();
