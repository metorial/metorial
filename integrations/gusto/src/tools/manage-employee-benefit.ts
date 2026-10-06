import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  enrollments: z
    .array(
      z.object({
        employeeBenefitId: z.string().describe('UUID of the employee benefit enrollment'),
        version: z.string().nullable().optional(),
        companyBenefitId: z
          .string()
          .nullable()
          .optional()
          .describe('UUID of the company benefit'),
        employeeId: z.string().nullable().optional().describe('UUID of the employee'),
        active: z.boolean().nullable().optional().describe('Whether active'),
        employeeDeduction: z
          .string()
          .nullable()
          .optional()
          .describe('Employee deduction amount'),
        companyContribution: z
          .string()
          .nullable()
          .optional()
          .describe('Company contribution amount')
      })
    )
    .optional()
    .describe('List of enrollments (for list action)'),
  enrollment: z
    .object({
      employeeBenefitId: z.string().describe('UUID of the employee benefit enrollment'),
      companyBenefitId: z
        .string()
        .nullable()
        .optional()
        .describe('UUID of the company benefit'),
      active: z.boolean().nullable().optional().describe('Whether active'),
      employeeDeduction: z
        .string()
        .nullable()
        .optional()
        .describe('Employee deduction amount'),
      companyContribution: z
        .string()
        .nullable()
        .optional()
        .describe('Company contribution amount'),
      version: z.string().nullable().optional().describe('Current resource version')
    })
    .optional()
    .describe('Single enrollment (for create/update)')
});

export let manageEmployeeBenefit = SlateTool.create(spec, {
  name: 'Manage Employee Benefit',
  key: 'manage_employee_benefit',
  description: `List, create, or update employee benefit enrollments. Enrolls employees in company-defined benefit plans with specified contribution amounts and deduction settings.`,
  instructions: [
    'To create an enrollment, provide employeeId, companyBenefitId, and contribution amounts.',
    'To update, provide employeeBenefitId and the fields to change.'
  ]
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for list, starting at 1.'),
      per: z.number().optional().describe('Results per list page, 1 to 100.'),
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      employeeId: z.string().optional().describe('Employee UUID (required for list/create)'),
      employeeBenefitId: z
        .string()
        .optional()
        .describe('Employee benefit UUID (required for update)'),
      companyBenefitId: z
        .string()
        .optional()
        .describe('Company benefit UUID (required for create)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      active: z.boolean().optional().describe('Whether the enrollment is active'),
      employeeDeduction: z
        .string()
        .optional()
        .describe('Employee deduction amount per pay period'),
      companyContribution: z
        .string()
        .optional()
        .describe('Company contribution amount per pay period'),
      employeeDeductionAnnualMaximum: z
        .string()
        .optional()
        .describe('Annual maximum employee deduction'),
      companyContributionAnnualMaximum: z
        .string()
        .optional()
        .describe('Annual maximum company contribution'),
      deductAsPercentage: z
        .boolean()
        .optional()
        .describe('Whether to deduct as a percentage of pay'),
      contributeAsPercentage: z
        .boolean()
        .optional()
        .describe('Whether company contributes as a percentage'),
      effectiveDate: z
        .string()
        .optional()
        .describe('Effective date for the benefit change (YYYY-MM-DD)')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx =>
    invokeGusto('manage_employee_benefit', ctx.input, ctx.auth, outputSchema)
  )
  .build();
