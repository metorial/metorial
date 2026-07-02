import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Search and list financial transactions (invoices, receipts, pro formas, bills) from Firmao. Supports filtering by customer, type, mode, and date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum results to return'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      customerId: z.number().optional().describe('Filter by customer ID'),
      type: z
        .string()
        .optional()
        .describe('Filter by type (INVOICE, RECEIPT, PROFORMA, CORRECTION, BILL)'),
      mode: z.string().optional().describe('Filter by mode (SALE, PURCHASE)')
    })
  )
  .output(
    z.object({
      transactions: z.array(
        z.object({
          transactionId: z.number(),
          transactionNumber: z.string().optional(),
          type: z.string().optional(),
          mode: z.string().optional(),
          transactionDate: z.string().optional(),
          invoiceDate: z.string().optional(),
          paymentDate: z.string().optional(),
          currency: z.string().optional(),
          paymentType: z.string().optional(),
          paid: z.boolean().optional(),
          paidValue: z.number().optional(),
          netTotal: z.number().optional(),
          grossTotal: z.number().optional(),
          customerId: z.number().optional(),
          customerName: z.string().optional(),
          creationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.customerId !== undefined)
      filters['customer(eq)'] = String(ctx.input.customerId);
    if (ctx.input.type) filters['type(eq)'] = ctx.input.type;
    if (ctx.input.mode) filters['mode(eq)'] = ctx.input.mode;

    let result = await client.list('transactions', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let transactions = result.data.map((t: any) => ({
      transactionId: t.id,
      transactionNumber: t.transactionNumber,
      type: t.type,
      mode: t.mode,
      transactionDate: t.transactionDate,
      invoiceDate: t.invoiceDate,
      paymentDate: t.paymentDate,
      currency: t.currency,
      paymentType: t.paymentType,
      paid: t.paid,
      paidValue: t.paidValue,
      netTotal: t.transactionNettoPrice,
      grossTotal: t.transactionBruttoPrice,
      customerId: typeof t.customer === 'object' ? t.customer?.id : t.customer,
      customerName: typeof t.customer === 'object' ? t.customer?.name : undefined,
      creationDate: t.creationDate
    }));

    return {
      output: { transactions, totalSize: result.totalSize },
      message: `Found **${transactions.length}** transaction(s) (total: ${result.totalSize}).`
    };
  })
  .build();
