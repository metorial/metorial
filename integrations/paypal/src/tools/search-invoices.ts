import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

let invoiceStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'SCHEDULED',
  'PAID',
  'MARKED_AS_PAID',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_PAID',
  'PARTIALLY_REFUNDED',
  'MARKED_AS_REFUNDED',
  'UNPAID',
  'PAYMENT_PENDING',
  'AUTO_CANCELLED',
  'PAID_EXTERNAL'
]);

let mapInvoice = (invoice: any) => ({
  invoiceId: invoice.id,
  status: invoice.status,
  invoiceNumber: invoice.detail?.invoice_number,
  recipientEmail: invoice.primary_recipients?.[0]?.billing_info?.email_address,
  totalAmount: invoice.amount?.value,
  currencyCode: invoice.amount?.currency_code,
  invoiceDate: invoice.detail?.invoice_date
});

export let searchInvoices = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description: `Search PayPal invoices by recipient, invoice number, status, and pagination. Use this when list pagination is not specific enough for reconciliation or follow-up workflows.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      recipientEmail: z.string().optional().describe('Recipient email address to search by'),
      recipientFirstName: z.string().optional().describe('Recipient first name to search by'),
      recipientLastName: z.string().optional().describe('Recipient last name to search by'),
      recipientBusinessName: z
        .string()
        .optional()
        .describe('Recipient business name to search by'),
      invoiceNumber: z.string().optional().describe('Invoice number to search by'),
      statuses: z.array(invoiceStatusSchema).optional().describe('Invoice statuses to match'),
      page: z.number().optional().describe('Page number (1-based)'),
      pageSize: z.number().optional().describe('Number of invoices per page (max 100)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total matching invoices'),
      totalPages: z.number().optional().describe('Total result pages'),
      invoices: z
        .array(
          z.object({
            invoiceId: z.string().describe('PayPal invoice ID'),
            status: z.string().optional().describe('Invoice status'),
            invoiceNumber: z.string().optional().describe('Invoice number'),
            recipientEmail: z.string().optional().describe('Recipient email'),
            totalAmount: z.string().optional().describe('Total invoice amount'),
            currencyCode: z.string().optional().describe('Currency code'),
            invoiceDate: z.string().optional().describe('Invoice date')
          })
        )
        .describe('Matching invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let body: Record<string, any> = {};
    if (ctx.input.recipientEmail) body.recipient_email = ctx.input.recipientEmail;
    if (ctx.input.recipientFirstName) body.recipient_first_name = ctx.input.recipientFirstName;
    if (ctx.input.recipientLastName) body.recipient_last_name = ctx.input.recipientLastName;
    if (ctx.input.recipientBusinessName)
      body.recipient_business_name = ctx.input.recipientBusinessName;
    if (ctx.input.invoiceNumber) body.invoice_number = ctx.input.invoiceNumber;
    if (ctx.input.statuses?.length) body.status = ctx.input.statuses;

    let result = await client.searchInvoices(body, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      totalRequired: true
    });
    let items = (result.items || []) as any[];
    let invoices = items.map(mapInvoice);

    return {
      output: {
        totalCount: result.total_items || result.total_count,
        totalPages: result.total_pages,
        invoices
      },
      message: `Found ${invoices.length} matching invoice(s).`
    };
  })
  .build();
