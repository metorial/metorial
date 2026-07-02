import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Lists customer payments in Zoho Invoice with optional filtering by customer, date, payment mode, and more.
Supports pagination via **page** and **perPage** parameters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerName: z.string().optional().describe('Filter payments by customer name'),
      referenceNumber: z.string().optional().describe('Filter payments by reference number'),
      date: z.string().optional().describe('Filter payments by date in YYYY-MM-DD format'),
      amount: z.string().optional().describe('Filter payments by amount'),
      paymentMode: z
        .string()
        .optional()
        .describe('Filter payments by payment mode (e.g. cash, check, bank_transfer)'),
      searchText: z.string().optional().describe('Search text to filter payments'),
      sortColumn: z
        .string()
        .optional()
        .describe('Column to sort results by (e.g. date, amount, customer_name)'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of payments per page (max 200)')
    })
  )
  .output(
    z.object({
      payments: z
        .array(
          z.object({
            paymentId: z.string().describe('Unique ID of the payment'),
            customerId: z.string().describe('ID of the customer'),
            customerName: z.string().describe('Name of the customer'),
            amount: z.number().describe('Payment amount'),
            date: z.string().describe('Payment date'),
            paymentMode: z.string().describe('Mode of payment'),
            referenceNumber: z.string().describe('Reference number of the payment'),
            createdTime: z.string().describe('Timestamp when the payment was created')
          })
        )
        .describe('Array of payment records'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of results per page'),
      hasMorePages: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let params: Record<string, any> = {};

    if (ctx.input.customerName !== undefined) params.customer_name = ctx.input.customerName;
    if (ctx.input.referenceNumber !== undefined)
      params.reference_number = ctx.input.referenceNumber;
    if (ctx.input.date !== undefined) params.date = ctx.input.date;
    if (ctx.input.amount !== undefined) params.amount = ctx.input.amount;
    if (ctx.input.paymentMode !== undefined) params.payment_mode = ctx.input.paymentMode;
    if (ctx.input.searchText !== undefined) params.search_text = ctx.input.searchText;
    if (ctx.input.sortColumn !== undefined) params.sort_column = ctx.input.sortColumn;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.per_page = ctx.input.perPage;

    let result = await client.listPayments(params);

    let payments = (result.payments ?? []).map((p: any) => ({
      paymentId: p.payment_id ?? '',
      customerId: p.customer_id ?? '',
      customerName: p.customer_name ?? '',
      amount: p.amount ?? 0,
      date: p.date ?? '',
      paymentMode: p.payment_mode ?? '',
      referenceNumber: p.reference_number ?? '',
      createdTime: p.created_time ?? ''
    }));

    let pageContext = result.pageContext ?? {};

    return {
      output: {
        payments,
        page: pageContext.page ?? 1,
        perPage: pageContext.per_page ?? 200,
        hasMorePages: pageContext.has_more_page ?? false
      },
      message: `Retrieved **${payments.length}** payment(s).${pageContext.has_more_page ? ' More pages are available.' : ''}`
    };
  })
  .build();
