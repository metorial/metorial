import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  payrolls: z
    .array(
      z.object({
        payrollId: z.string().describe('UUID of the payroll'),
        companyId: z.string().nullable().optional(),
        payPeriodStartDate: z
          .string()
          .nullable()
          .optional()
          .describe('Start date of the pay period'),
        payPeriodEndDate: z
          .string()
          .nullable()
          .optional()
          .describe('End date of the pay period'),
        checkDate: z.string().nullable().optional().describe('Date employees are paid'),
        processed: z
          .boolean()
          .nullable()
          .optional()
          .describe('Whether payroll has been processed'),
        processingStatus: z.string().nullable().optional().describe('Processing status'),
        payrollType: z
          .string()
          .nullable()
          .optional()
          .describe('Type of payroll (regular, off_cycle, etc.)'),
        totalGrossPay: z.string().nullable().optional().describe('Total gross pay amount'),
        totalNetPay: z.string().nullable().optional().describe('Total net pay amount'),
        totalEmployerTaxes: z.string().nullable().optional().describe('Total employer taxes'),
        totalEmployeeTaxes: z.string().nullable().optional().describe('Total employee taxes')
      })
    )
    .describe('List of payrolls')
});

export let listPayrolls = SlateTool.create(spec, {
  name: 'List Payrolls',
  key: 'list_payrolls',
  description: `List payrolls for a company. Can filter by processing status and date range. Returns payroll summaries including pay period, status, and totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      payrollTypes: z
        .string()
        .optional()
        .describe('Comma-separated documented types: regular, off_cycle, external.'),
      companyId: companyIdSchema,
      processingStatuses: z
        .array(z.enum(['unprocessed', 'calculated', 'submitted', 'processed', 'paid']))
        .optional()
        .describe('Filter by processing status(es)'),
      startDate: z
        .string()
        .optional()
        .describe('Filter payrolls on or after this date (YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter payrolls on or before this date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination'),
      per: z.number().optional().describe('Number of results per page')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('list_payrolls', ctx.input, ctx.auth, outputSchema))
  .build();
