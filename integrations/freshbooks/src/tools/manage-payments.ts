import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    paymentId: z.number().describe('Payment ID'),
    invoiceId: z.number().nullable().optional(),
    clientId: z.number().nullable().optional(),
    amount: z.any().optional(),
    date: z.string().nullable().optional(),
    paymentType: z.string().nullable().optional(),
    note: z.string().nullable().optional()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let managePayments = SlateTool.create(spec, {
  name: 'Manage Payments',
  key: 'manage_payments',
  description: `Record, update, or delete payments against invoices in FreshBooks. Use this to track payments received from clients. Payments are linked to a specific invoice.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      ...scopeInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      paymentId: z.number().optional().describe('Payment ID (required for update/delete)'),
      invoiceId: z
        .number()
        .optional()
        .describe('Invoice ID to apply payment to (required for create)'),
      amount: z.string().optional().describe('Payment amount (e.g. "100.00")'),
      date: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
      paymentType: z
        .string()
        .optional()
        .describe(
          'Payment method (e.g. "Check", "Credit", "Cash", "Bank Transfer", "Credit Card")'
        ),
      note: z.string().optional().describe('Payment reference or note')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('manage_payments', ctx, outputSchema))
  .build();
