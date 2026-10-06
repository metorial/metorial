import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  employees: z
    .array(
      z.object({
        employeeId: z.string().describe('UUID of the employee'),
        version: z.string().nullable().optional(),
        companyId: z.string().nullable().optional(),
        firstName: z.string().nullable().optional().describe('First name'),
        lastName: z.string().nullable().optional().describe('Last name'),
        middleInitial: z.string().nullable().optional().describe('Middle initial'),
        email: z.string().nullable().optional().describe('Email address'),
        department: z.string().nullable().optional().describe('Department name'),
        terminated: z
          .boolean()
          .nullable()
          .optional()
          .describe('Whether the employee is terminated'),
        twoPercentShareholder: z
          .boolean()
          .nullable()
          .optional()
          .describe('Whether the employee is a 2% shareholder'),
        onboardingStatus: z.string().nullable().optional().describe('Onboarding status')
      })
    )
    .describe('List of employees'),
  totalCount: z.number().nullable().optional().describe('Total number of employees')
});

export let listEmployees = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `List employees for a company. Supports filtering by termination status and pagination. Returns employee profiles including names, emails, and employment details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: companyIdSchema,
      terminated: z
        .boolean()
        .optional()
        .describe('If true, include terminated employees. If false, only active employees.'),
      page: z.number().optional().describe('Page number for pagination'),
      per: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('list_employees', ctx.input, ctx.auth, outputSchema))
  .build();
