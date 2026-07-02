import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

let employeeSummarySchema = z.object({
  employeeId: z.string().describe('Employee ID'),
  name: z.string().optional().describe('Full name'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Personal email'),
  workEmail: z.string().optional().describe('Work email'),
  department: z.string().optional().describe('Department'),
  jobTitle: z.string().optional().describe('Job title'),
  status: z.string().optional().describe('Employee status'),
  startDate: z.string().optional().describe('Start date'),
  createdAt: z.string().optional().describe('Record creation timestamp')
});

export let listEmployeesTool = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `List employees from the Workable HR module. Optionally filter by email address. Use this to browse employee records, verify employment status, or find employee IDs for further operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by personal email'),
      workEmail: z.string().optional().describe('Filter by work email'),
      limit: z.number().optional().describe('Maximum number of employees to return'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      employees: z.array(employeeSummarySchema).describe('List of employees'),
      paging: z
        .object({
          next: z.string().optional().describe('Cursor for the next page')
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.listEmployees({
      email: ctx.input.email,
      work_email: ctx.input.workEmail,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let employees = (result.employees || []).map((e: any) => ({
      employeeId: e.id,
      name: e.name,
      firstname: e.firstname,
      lastname: e.lastname,
      email: e.email,
      workEmail: e.work_email,
      department: e.department,
      jobTitle: e.job_title,
      status: e.status,
      startDate: e.start_date,
      createdAt: e.created_at
    }));

    return {
      output: {
        employees,
        paging: result.paging
      },
      message: `Found **${employees.length}** employee(s).`
    };
  })
  .build();
