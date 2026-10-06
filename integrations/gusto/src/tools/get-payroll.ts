import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  payrollId: z.string().describe('UUID of the payroll'),
  companyId: z.string().nullable().optional(),
  payPeriodStartDate: z
    .string()
    .nullable()
    .optional()
    .describe('Start date of the pay period'),
  payPeriodEndDate: z.string().nullable().optional().describe('End date of the pay period'),
  checkDate: z.string().nullable().optional().describe('Date employees are paid'),
  processed: z.boolean().nullable().optional().describe('Whether payroll has been processed'),
  processingStatus: z.string().nullable().optional().describe('Processing status'),
  payrollType: z.string().nullable().optional().describe('Type of payroll'),
  version: z
    .string()
    .nullable()
    .optional()
    .describe('Resource version for optimistic locking'),
  totals: z
    .any()
    .optional()
    .describe('Payroll totals including gross pay, net pay, taxes, etc.'),
  employeeCompensations: z
    .array(z.any())
    .optional()
    .describe('Per-employee compensation details')
});

export let getPayroll = SlateTool.create(spec, {
  name: 'Get Payroll',
  key: 'get_payroll',
  description: `Retrieve detailed information about a specific payroll, including employee compensations, taxes, deductions, and totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Employee-compensation page number, starting at 1.'),
      per: z.number().optional().describe('Employee compensations per page, 1 to 100.'),
      companyId: companyIdSchema,
      payrollId: z.string().describe('The UUID of the payroll')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('get_payroll', ctx.input, ctx.auth, outputSchema))
  .build();
