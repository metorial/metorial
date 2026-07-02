import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { mapEmployee } from '../lib/shapes';
import { spec } from '../spec';

let allowedEmployeeLimits = [10, 20, 50, 100];

let employeeSummarySchema = z.object({
  employeeId: z.string().describe('Employee ID'),
  name: z.string().optional().describe('Full name'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Personal email'),
  workEmail: z.string().optional().describe('Work email'),
  department: z.string().optional().describe('Department'),
  departmentId: z.string().optional().describe('Department ID'),
  jobTitle: z.string().optional().describe('Job title'),
  state: z.string().optional().describe('Employee state'),
  status: z.string().optional().describe('Employee status/state'),
  startDate: z.string().optional().describe('Start date'),
  managerId: z.string().optional().describe('Manager employee ID'),
  legalEntityId: z.string().optional().describe('Legal entity ID'),
  workScheduleId: z.string().optional().describe('Work schedule ID'),
  createdAt: z.string().optional().describe('Record creation timestamp'),
  updatedAt: z.string().optional().describe('Record update timestamp')
});

export let listEmployeesTool = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `List employees from Workable HR using Workable's query, ordering, limit, and offset parameters. Use memberId when an account token requires member context.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query supported by Workable'),
      orderBy: z
        .enum(['division', 'department'])
        .optional()
        .describe('Order employees by division or department'),
      memberId: z
        .string()
        .optional()
        .describe('Member ID for account-token access to employee data'),
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum number of employees to return. Workable accepts 10, 20, 50, or 100.'
        ),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      employees: z.array(employeeSummarySchema).describe('List of employees'),
      totalCount: z.number().optional().describe('Total employee count returned by Workable'),
      limit: z.number().optional().describe('Limit used by Workable'),
      offset: z.number().optional().describe('Offset used by Workable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.limit !== undefined && !allowedEmployeeLimits.includes(ctx.input.limit)) {
      throw createApiServiceError('limit must be one of 10, 20, 50, or 100.');
    }

    let result = await client.listEmployees({
      query: ctx.input.query,
      order_by: ctx.input.orderBy,
      member_id: ctx.input.memberId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let employees = (result.employees || []).map(mapEmployee);

    return {
      output: {
        employees,
        totalCount: result.totalCount ?? result.total_count,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      },
      message: `Found **${employees.length}** employee(s).`
    };
  })
  .build();
