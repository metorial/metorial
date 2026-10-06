import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  garnishments: z
    .array(
      z.object({
        garnishmentId: z.string().describe('UUID of the garnishment'),
        version: z.string().nullable().optional(),
        amountExact: z.string().nullable().optional(),
        employeeId: z.string().nullable().optional(),
        recurring: z.boolean().nullable().optional(),
        times: z.number().nullable().optional(),
        description: z.string().nullable().optional().describe('Description'),
        active: z.boolean().nullable().optional().describe('Whether active'),
        amount: z.number().nullable().optional().describe('Amount per pay period'),
        courtOrdered: z.boolean().nullable().optional().describe('Whether court-ordered')
      })
    )
    .optional()
    .describe('List of garnishments (for list action)'),
  garnishment: z
    .object({
      garnishmentId: z.string().describe('UUID of the garnishment'),
      amountExact: z.string().nullable().optional(),
      employeeId: z.string().nullable().optional(),
      recurring: z.boolean().nullable().optional(),
      times: z.number().nullable().optional(),
      description: z.string().nullable().optional().describe('Description'),
      active: z.boolean().nullable().optional().describe('Whether active'),
      amount: z.number().nullable().optional().describe('Amount per pay period'),
      courtOrdered: z.boolean().nullable().optional().describe('Whether court-ordered'),
      version: z.string().nullable().optional().describe('Current resource version')
    })
    .optional()
    .describe('Single garnishment (for create/update)')
});

export let manageGarnishment = SlateTool.create(spec, {
  name: 'Manage Garnishment',
  key: 'manage_garnishment',
  description: `List, create, or update wage garnishments for an employee. Supports ordinary garnishments with exact amounts and schedules; specialized child-support setup must be completed in Gusto.`
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for list, starting at 1.'),
      per: z.number().optional().describe('Results per list page, 1 to 100.'),
      recurring: z
        .boolean()
        .optional()
        .describe('Whether an ordinary garnishment recurs indefinitely.'),
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      employeeId: z.string().optional().describe('Employee UUID (required for list/create)'),
      garnishmentId: z.string().optional().describe('Garnishment UUID (required for update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      description: z.string().optional().describe('Description of the garnishment'),
      active: z.boolean().optional().describe('Whether the garnishment is active'),
      amount: z.number().optional().describe('Garnishment amount per pay period'),
      courtOrdered: z.boolean().optional().describe('Whether court-ordered'),
      times: z
        .number()
        .optional()
        .describe('Positive number of deductions; use recurring for an ongoing deduction.'),
      recurringChildSupport: z
        .boolean()
        .optional()
        .describe(
          'Legacy unsupported field. Specialized child-support setup must be completed in Gusto; use recurring for ordinary deductions.'
        ),
      annualMaximum: z.number().optional().describe('Annual maximum deduction'),
      payPeriodMaximum: z.number().optional().describe('Maximum deduction per pay period'),
      deductAsPercentage: z.boolean().optional().describe('Whether to deduct as a percentage')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx =>
    invokeGusto('manage_garnishment', ctx.input, ctx.auth, outputSchema)
  )
  .build();
