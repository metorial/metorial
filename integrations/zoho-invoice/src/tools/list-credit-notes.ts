import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCreditNotes = SlateTool.create(spec, {
  name: 'List Credit Notes',
  key: 'list_credit_notes',
  description: `Lists credit notes in Zoho Invoice with optional filtering by status, customer, date, and more.
Supports pagination via **page** and **perPage** parameters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['open', 'closed', 'void'])
        .optional()
        .describe('Filter credit notes by status'),
      customerName: z.string().optional().describe('Filter credit notes by customer name'),
      creditNoteNumber: z
        .string()
        .optional()
        .describe('Filter credit notes by credit note number'),
      date: z.string().optional().describe('Filter credit notes by date in YYYY-MM-DD format'),
      total: z.string().optional().describe('Filter credit notes by total amount'),
      balance: z.string().optional().describe('Filter credit notes by remaining balance'),
      searchText: z.string().optional().describe('Search text to filter credit notes'),
      sortColumn: z
        .string()
        .optional()
        .describe('Column to sort results by (e.g. date, total, balance, customer_name)'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of credit notes per page (max 200)')
    })
  )
  .output(
    z.object({
      creditNotes: z
        .array(
          z.object({
            creditNoteId: z.string().describe('Unique ID of the credit note'),
            creditNoteNumber: z.string().describe('Credit note number'),
            status: z.string().describe('Status of the credit note'),
            customerName: z.string().describe('Name of the associated customer'),
            customerId: z.string().describe('ID of the associated customer'),
            date: z.string().describe('Credit note date'),
            total: z.number().describe('Total amount of the credit note'),
            balance: z.number().describe('Remaining balance on the credit note'),
            createdTime: z.string().describe('Timestamp when the credit note was created')
          })
        )
        .describe('Array of credit note records'),
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

    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    if (ctx.input.customerName !== undefined) params.customer_name = ctx.input.customerName;
    if (ctx.input.creditNoteNumber !== undefined)
      params.creditnote_number = ctx.input.creditNoteNumber;
    if (ctx.input.date !== undefined) params.date = ctx.input.date;
    if (ctx.input.total !== undefined) params.total = ctx.input.total;
    if (ctx.input.balance !== undefined) params.balance = ctx.input.balance;
    if (ctx.input.searchText !== undefined) params.search_text = ctx.input.searchText;
    if (ctx.input.sortColumn !== undefined) params.sort_column = ctx.input.sortColumn;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.per_page = ctx.input.perPage;

    let result = await client.listCreditNotes(params);

    let creditNotes = (result.creditNotes ?? []).map((cn: any) => ({
      creditNoteId: cn.creditnote_id ?? '',
      creditNoteNumber: cn.creditnote_number ?? '',
      status: cn.status ?? '',
      customerName: cn.customer_name ?? '',
      customerId: cn.customer_id ?? '',
      date: cn.date ?? '',
      total: cn.total ?? 0,
      balance: cn.balance ?? 0,
      createdTime: cn.created_time ?? ''
    }));

    let pageContext = result.pageContext ?? {};

    return {
      output: {
        creditNotes,
        page: pageContext.page ?? 1,
        perPage: pageContext.per_page ?? 200,
        hasMorePages: pageContext.has_more_page ?? false
      },
      message: `Retrieved **${creditNotes.length}** credit note(s).${pageContext.has_more_page ? ' More pages are available.' : ''}`
    };
  })
  .build();
