import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  accepted: z
    .boolean()
    .nullable()
    .optional()
    .describe(
      'Whether Gusto accepted an asynchronous request, without confirming completion.'
    ),
  operation: z.enum(['calculate', 'submit']).optional(),
  payrollId: z.string().describe('UUID of the payroll'),
  processingStatus: z.string().nullable().optional().describe('Updated processing status'),
  checkDate: z.string().nullable().optional().describe('Date employees are paid'),
  totals: z.any().optional().describe('Payroll totals after calculation')
});

export let processPayroll = SlateTool.create(spec, {
  name: 'Process Payroll',
  key: 'process_payroll',
  description:
    'Request asynchronous payroll calculation or submission for an approved Embedded Payroll company. Gusto app integrations cannot run payroll. A successful response confirms acceptance; use get_payroll to verify the eventual processing outcome.',
  instructions: [
    'Call get_current_context to identify the authorized company and granted scopes.',
    'Read and review the unprocessed payroll before submitting it.',
    'Calculation and submission are asynchronous. Do not retry an ambiguous request until its outcome is checked in Gusto.'
  ],
  constraints: [
    'Payroll submission initiates payroll processing and may schedule money movement.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      companyId: companyIdSchema,
      payrollId: z.string().describe('The UUID of the payroll'),
      action: z
        .enum(['calculate', 'submit'])
        .describe('Whether to calculate or submit the payroll')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('process_payroll', ctx.input, ctx.auth, outputSchema))
  .build();
