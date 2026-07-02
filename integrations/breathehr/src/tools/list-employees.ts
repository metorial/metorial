import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmployees = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `Retrieve a paginated list of employees from Breathe HR. Filter by employee status to find active, archived, or all employees. Returns employee personal and employment details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z.enum(['active', 'archived']).optional().describe('Filter employees by status'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      employees: z.array(z.record(z.string(), z.any())).describe('List of employee records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listEmployees({
      status: ctx.input.status,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let employees = result?.employees || [];

    return {
      output: { employees },
      message: `Retrieved **${employees.length}** employee(s).`
    };
  })
  .build();
