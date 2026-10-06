import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, pageParams, paginationSchema, readRows } from '../lib/response';
import { spec } from '../spec';

export let listEmployees = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `Retrieve a paginated list of employees from Breathe HR. Inspect returned employee status fields; the legacy status query is unsupported by the current endpoint. Returns employee personal and employment details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['active', 'archived'])
        .optional()
        .describe(
          'Legacy unsupported status filter; omit and inspect returned employee statuses'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema.optional(),
      employees: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of employee records')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    if (ctx.input.status !== undefined)
      fail(
        'The current employee endpoint does not support the legacy status filter; omit status and inspect returned employee statuses.'
      );
    const result = await client.list('employees', { ...pageParams(ctx.input, true) }, true);
    const employees = readRows(result, 'employees');
    return {
      output: { employees, pagination: result.pagination },
      message: `Retrieved **${employees.length}** employee(s).`
    };
  })
  .build();
