import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  FinmeiClient,
  optionalNumber,
  optionalString,
  pagination,
  readList,
  requireId
} from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve a paginated list of invoices from Finmei. Returns invoice summaries including ID, code, status, amounts, currency, and dates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (1-based)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of invoices per page (the provider may use a fixed page size)')
    })
  )
  .output(
    z.object({
      invoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('Invoice ID'),
            code: z.string().optional().describe('Invoice code/number'),
            status: z.string().optional().describe('Invoice status'),
            currency: z.string().optional().describe('Currency code'),
            amountDue: z.number().optional().describe('Amount due'),
            issueDate: z.string().optional().describe('Issue date'),
            dueDate: z.string().optional().describe('Due date'),
            total: z.number().optional().describe('Invoice total including VAT'),
            shareLink: z.string().optional().describe('Provider invoice sharing link')
          })
        )
        .describe('List of invoices'),
      rawResponse: z.any().optional().describe('Complete provider response'),
      total: z.number().optional().describe('Total number of invoices'),
      page: z.number().optional().describe('Current page'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FinmeiClient(ctx.auth.token);

    let result = await client.listInvoices({
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let invoices = readList(result, 'invoices').map(inv => ({
      invoiceId: requireId(inv.id, 'invoice ID'),
      ...pickDefined({
        code:
          inv.invoice_number === undefined || inv.invoice_number === null
            ? optionalString(inv.code, 'invoice code')
            : requireId(inv.invoice_number, 'invoice number'),
        status: optionalString(inv.payment_status ?? inv.status, 'invoice status'),
        currency: optionalString(inv.currency, 'invoice currency'),
        amountDue: optionalNumber(inv.amount_due, 'amount due'),
        issueDate: optionalString(
          inv.invoice_date ?? inv.issue_date ?? inv.date,
          'invoice date'
        ),
        dueDate: optionalString(inv.pay_until_date ?? inv.due_date, 'invoice due date'),
        total: optionalNumber(inv.total_incl_vat ?? inv.total, 'invoice total'),
        shareLink: optionalString(inv.share_link, 'invoice share link')
      })
    }));

    let metadata = pagination(result);
    return {
      output: {
        invoices,
        ...metadata,
        rawResponse: result
      },
      message: `Found **${invoices.length}** invoice(s)${metadata.total !== undefined ? ` out of ${metadata.total} total` : ''}.`
    };
  })
  .build();
