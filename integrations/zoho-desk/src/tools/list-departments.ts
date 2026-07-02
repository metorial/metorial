import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDepartments = SlateTool.create(spec, {
  name: 'List Departments',
  key: 'list_departments',
  description: `List all departments in the organization. Optionally retrieve a specific department by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      departmentId: z
        .string()
        .optional()
        .describe('Specific department ID to retrieve. If omitted, lists all departments.'),
      from: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Number of departments to return')
    })
  )
  .output(
    z.object({
      department: z
        .object({
          departmentId: z.string().describe('Department ID'),
          name: z.string().optional().describe('Department name'),
          description: z.string().optional().describe('Department description'),
          isVisibleInCustomerPortal: z
            .boolean()
            .optional()
            .describe('Visible in customer portal')
        })
        .optional()
        .describe('Single department (when departmentId is provided)'),
      departments: z
        .array(
          z.object({
            departmentId: z.string().describe('Department ID'),
            name: z.string().optional().describe('Department name'),
            description: z.string().optional().describe('Department description')
          })
        )
        .optional()
        .describe('List of departments (when departmentId is omitted)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.departmentId) {
      let result = await client.getDepartment(ctx.input.departmentId);

      return {
        output: {
          department: {
            departmentId: result.id,
            name: result.name,
            description: result.description,
            isVisibleInCustomerPortal: result.isVisibleInCustomerPortal
          },
          departments: undefined
        },
        message: `Retrieved department **${result.name || result.id}**`
      };
    }

    let result = await client.listDepartments({
      from: ctx.input.from,
      limit: ctx.input.limit
    });

    let data = Array.isArray(result) ? result : result?.data || [];

    let departments = data.map((d: any) => ({
      departmentId: d.id,
      name: d.name,
      description: d.description
    }));

    return {
      output: { department: undefined, departments },
      message: `Found **${departments.length}** department(s)`
    };
  })
  .build();
