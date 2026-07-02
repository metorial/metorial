import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let invoiceSchema = z.object({
  invoiceId: z.number().optional().describe('ProAbono invoice ID'),
  status: z
    .string()
    .optional()
    .describe('Invoice status (Draft, Due, Paid, Problem, Void, Uncollectible)'),
  stateInvoice: z.string().optional().describe('Technical invoice state'),
  referenceCustomer: z.string().optional().describe('Customer reference'),
  amountTotal: z.number().optional().describe('Total amount in cents'),
  amountSubtotal: z.number().optional().describe('Subtotal amount in cents'),
  amountDue: z.number().optional().describe('Amount due in cents'),
  currency: z.string().optional().describe('Currency code'),
  dateGenerated: z.string().optional().describe('Invoice generation date'),
  datePaid: z.string().optional().describe('Date invoice was paid'),
  typePayment: z.string().optional().describe('Payment method type'),
  links: z.array(z.any()).optional().describe('Links to PDF downloads and payment pages')
});

export let manageInvoices = SlateTool.create(spec, {
  name: 'Manage Invoices',
  key: 'manage_invoices',
  description: `Retrieve and list invoices, or trigger on-demand billing.
Invoices include status tracking, payment type, and encrypted links to PDF downloads.
Use "bill" to generate an invoice from a customer's outstanding balance.`,
  instructions: [
    'Use "get" with invoiceId to retrieve a single invoice.',
    'Use "list" to browse invoices; filter by referenceCustomer for a specific customer.',
    'Use "bill" with referenceCustomer to trigger on-demand billing of outstanding balance.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'list', 'bill']).describe('Action to perform'),
      invoiceId: z.number().optional().describe('Invoice ID for retrieval'),
      referenceCustomer: z
        .string()
        .optional()
        .describe('Customer reference for filtering or billing'),
      customerIdNumeric: z.number().optional().describe('ProAbono customer ID for filtering'),
      page: z.number().optional().describe('Page number for list'),
      sizePage: z.number().optional().describe('Items per page for list')
    })
  )
  .output(
    z.object({
      invoice: invoiceSchema.optional().describe('Single invoice details'),
      invoices: z.array(invoiceSchema).optional().describe('List of invoices'),
      totalItems: z.number().optional().describe('Total items for list'),
      page: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProAbonoClient({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (ctx.input.invoiceId == null) throw new Error('invoiceId is required for get');
      let result = await client.getInvoice(ctx.input.invoiceId);
      let invoice = mapInvoice(result);
      return {
        output: { invoice },
        message: `Retrieved invoice **#${invoice.invoiceId}** — status: ${invoice.status}, amount: ${invoice.amountTotal ?? 0} cents`
      };
    }

    if (action === 'list') {
      let result = await client.listInvoices({
        ReferenceCustomer: ctx.input.referenceCustomer,
        IdCustomer: ctx.input.customerIdNumeric,
        Page: ctx.input.page,
        SizePage: ctx.input.sizePage
      });
      let items = result?.Items || [];
      let invoices = items.map(mapInvoice);
      return {
        output: {
          invoices,
          totalItems: result?.TotalItems,
          page: result?.Page
        },
        message: `Found **${invoices.length}** invoices (total: ${result?.TotalItems || 0})`
      };
    }

    if (action === 'bill') {
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for bill');
      let result = await client.billCustomer(ctx.input.referenceCustomer);
      let invoice = mapInvoice(result);
      return {
        output: { invoice },
        message: `Billed customer **${ctx.input.referenceCustomer}** — invoice **#${invoice.invoiceId}** generated`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapInvoice = (raw: any) => ({
  invoiceId: raw?.Id,
  status: raw?.Status,
  stateInvoice: raw?.StateInvoice,
  referenceCustomer: raw?.ReferenceCustomer,
  amountTotal: raw?.AmountTotal,
  amountSubtotal: raw?.AmountSubtotal,
  amountDue: raw?.AmountDue,
  currency: raw?.Currency,
  dateGenerated: raw?.DateGenerated,
  datePaid: raw?.DatePaid,
  typePayment: raw?.TypePayment,
  links: raw?.Links
});
