import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    invoices: z.array(
      z.object({
        invoiceId: z.number(),
        invoiceNumber: z.string().nullable().optional(),
        customerId: z.number().nullable().optional(),
        status: z.number().nullable().optional(),
        amount: z.any().optional(),
        outstandingAmount: z.any().optional(),
        currencyCode: z.string().nullable().optional(),
        createDate: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional()
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

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Search and list invoices in FreshBooks. Supports filtering by client, status, date range, and invoice number. Returns paginated results with key invoice summary information.`,
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
      customerId: z.number().optional().describe('Filter by client ID'),
      status: z
        .number()
        .optional()
        .describe(
          'Filter by status (1=draft, 2=sent, 3=viewed, 4=paid, 5=auto-paid, 6=partial, 7=disputed, 8=overdue)'
        ),
      dateFrom: z
        .string()
        .optional()
        .describe('Filter invoices created on or after this date (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('Filter invoices created on or before this date (YYYY-MM-DD)'),
      invoiceNumber: z.string().optional().describe('Filter by invoice number')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('list_invoices', ctx, outputSchema))
  .build();
