import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve an employee by ID, or list employees with pagination. Returns employee details including name, department, designation, and contact info.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      employeeId: z
        .string()
        .optional()
        .describe('ID of a specific employee to retrieve. If omitted, lists employees.'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of employees per page')
    })
  )
  .output(
    z.object({
      employees: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of employee records'),
      totalCount: z.number().optional().describe('Total number of employees'),
      currentPage: z.number().optional().describe('Current page number'),
      lastPage: z.number().optional().describe('Last page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    if (ctx.input.employeeId) {
      let result = await client.getEmployee(ctx.input.employeeId);
      return {
        output: { employees: [result.data] },
        message: `Retrieved employee **${result.data.name ?? ctx.input.employeeId}**.`
      };
    }

    let result = await client.listEmployees(ctx.input.page, ctx.input.perPage);

    return {
      output: {
        employees: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} employee(s)${result.meta ? ` (page ${result.meta.current_page} of ${result.meta.last_page})` : ''}.`
    };
  })
  .build();
