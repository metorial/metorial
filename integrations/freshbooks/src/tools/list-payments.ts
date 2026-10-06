import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    payments: z.array(
      z.object({
        paymentId: z.number(),
        invoiceId: z.number().nullable().optional(),
        clientId: z.number().nullable().optional(),
        amount: z.any().optional(),
        date: z.string().nullable().optional(),
        paymentType: z.string().nullable().optional(),
        note: z.string().nullable().optional()
      })
    ),
    totalCount: z.number(),
    currentPage: z.number(),
    totalPages: z.number()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Search and list payments in FreshBooks. Supports filtering by client and invoice. Returns paginated results.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...scopeInput,
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)'),
      clientId: z.number().optional().describe('Filter by client ID'),
      invoiceId: z.number().optional().describe('Filter by invoice ID')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('list_payments', ctx, outputSchema))
  .build();
