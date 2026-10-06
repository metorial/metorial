import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  totals: z
    .object({
      wages: z.string().nullable().optional(),
      reimbursements: z.string().nullable().optional()
    })
    .optional(),
  payments: z
    .array(
      z.object({
        contractorPaymentId: z.string().describe('UUID of the payment'),
        cancelled: z.boolean().nullable().optional(),
        mayCancel: z.boolean().nullable().optional(),
        contractorId: z.string().nullable().optional().describe('UUID of the contractor'),
        wage: z.string().nullable().optional().describe('Wage amount'),
        hours: z.string().nullable().optional().describe('Hours worked'),
        bonus: z.string().nullable().optional().describe('Bonus amount'),
        reimbursement: z.string().nullable().optional().describe('Reimbursement amount'),
        paymentDate: z.string().nullable().optional().describe('Payment date'),
        status: z.string().nullable().optional().describe('Payment status')
      })
    )
    .optional()
    .describe('List of payments (for list action)'),
  payment: z
    .object({
      contractorPaymentId: z.string().describe('UUID of the payment'),
      cancelled: z.boolean().nullable().optional(),
      mayCancel: z.boolean().nullable().optional(),
      contractorId: z.string().nullable().optional().describe('UUID of the contractor'),
      wage: z.string().nullable().optional().describe('Wage amount'),
      bonus: z.string().nullable().optional().describe('Bonus amount'),
      reimbursement: z.string().nullable().optional().describe('Reimbursement amount'),
      paymentDate: z.string().nullable().optional().describe('Payment date')
    })
    .optional()
    .describe('Created or cancelled payment')
});

export let manageContractorPayment = SlateTool.create(spec, {
  name: 'Manage Contractor Payment',
  key: 'manage_contractor_payment',
  description: `List contractor payments grouped by contractor and returned as individual payments. Creating or cancelling payments requires an approved Embedded Payroll application with payrolls:run. Use get_current_context to discover the authorized company.`,
  instructions: [
    'When creating a payment, provide contractorId and either hourly or fixed compensation details.',
    'start_date and end_date query params are required when listing payments.'
  ]
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for list, starting at 1.'),
      per: z.number().optional().describe('Results per list page, 1 to 100.'),
      action: z.enum(['list', 'create', 'cancel']).describe('The action to perform'),
      companyId: companyIdSchema,
      contractorPaymentId: z
        .string()
        .optional()
        .describe('Payment UUID (required for cancel)'),
      contractorId: z.string().optional().describe('Contractor UUID (required for create)'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD) for creating a payment'),
      wage: z.number().optional().describe('Fixed wage amount'),
      hours: z.number().optional().describe('Number of hours worked (hourly contractors)'),
      bonus: z.number().optional().describe('Bonus amount'),
      reimbursement: z.number().optional().describe('Reimbursement amount'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for listing payments (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('End date for listing payments (YYYY-MM-DD)')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx =>
    invokeGusto('manage_contractor_payment', ctx.input, ctx.auth, outputSchema)
  )
  .build();
