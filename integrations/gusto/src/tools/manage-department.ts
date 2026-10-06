import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  departments: z
    .array(
      z.object({
        departmentId: z.string().describe('UUID of the department'),
        version: z.string().nullable().optional(),
        title: z.string().nullable().optional().describe('Department title'),
        companyId: z.string().nullable().optional().describe('Company UUID')
      })
    )
    .optional()
    .describe('List of departments'),
  department: z
    .object({
      departmentId: z.string().describe('UUID of the department'),
      companyId: z.string().nullable().optional(),
      title: z.string().nullable().optional().describe('Department title'),
      version: z.string().nullable().optional().describe('Current resource version')
    })
    .optional()
    .describe('Created or updated department')
});

export let manageDepartment = SlateTool.create(spec, {
  name: 'Manage Department',
  key: 'manage_department',
  description: `List, create, or update departments for a company. Departments help organize employees and can be used for reporting and payroll categorization.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      companyId: companyIdSchema.optional(),
      departmentId: z.string().optional().describe('Department UUID (required for update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      title: z.string().optional().describe('Department title/name')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('manage_department', ctx.input, ctx.auth, outputSchema))
  .build();
