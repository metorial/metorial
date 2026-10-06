import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  employment: z
    .object({
      effectiveDate: z.string().nullable().optional(),
      active: z.boolean().nullable().optional(),
      version: z.string().nullable().optional(),
      runTerminationPayroll: z.boolean().nullable().optional(),
      fileNewHireReport: z.boolean().nullable().optional(),
      workLocationId: z.string().nullable().optional()
    })
    .optional(),
  employeeId: z.string().describe('UUID of the employee'),
  companyId: z.string().nullable().optional(),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  email: z.string().nullable().optional().describe('Email address'),
  version: z.string().nullable().optional().describe('Current resource version'),
  onboardingStatus: z.string().nullable().optional().describe('Onboarding status'),
  terminated: z.boolean().nullable().optional().describe('Whether the employee is terminated')
});

export let manageEmployee = SlateTool.create(spec, {
  name: 'Manage Employee',
  key: 'manage_employee',
  description: `Create, update, retrieve, terminate, or rehire a W-2 employee.
- To **create**: provide companyId, firstName, lastName, and optionally other fields.
- To **get** or **update**: provide employeeId and any fields to update.
- To **terminate**: provide employeeId and termination details.
- To **rehire**: provide employeeId and rehire details.`,
  instructions: [
    'When creating, companyId is required along with firstName and lastName.',
    'When updating, employeeId and version are required. Only include fields you want to change.',
    'The version field is required for updates to prevent conflicts (optimistic locking).'
  ]
})
  .input(
    z.object({
      fileNewHireReport: z
        .boolean()
        .optional()
        .describe('Required for rehire: whether Gusto files a new-hire report.'),
      workLocationId: z
        .string()
        .optional()
        .describe(
          'Required for rehire: exact company location UUID from manage_company_location.'
        ),
      action: z
        .enum(['create', 'get', 'update', 'terminate', 'rehire'])
        .describe('The action to perform'),
      companyId: companyIdSchema.optional(),
      employeeId: z
        .string()
        .optional()
        .describe('Employee UUID (required for get/update/terminate/rehire)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      middleInitial: z.string().optional().describe('Middle initial'),
      email: z.string().optional().describe('Personal email address'),
      dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      ssn: z.string().optional().describe('Social Security Number'),
      effectiveDate: z
        .string()
        .optional()
        .describe('Effective date for termination or rehire (YYYY-MM-DD)'),
      runTerminationPayroll: z
        .boolean()
        .optional()
        .describe('Whether to run a termination payroll')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('manage_employee', ctx.input, ctx.auth, outputSchema))
  .build();
