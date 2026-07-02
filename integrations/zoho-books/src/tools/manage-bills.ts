import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listBillsTool = SlateTool.create(spec, {
  name: 'List Bills',
  key: 'list_bills',
  description: `Search and list bills from vendors with filtering by status, vendor, and date range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      vendorId: z.string().optional().describe('Filter by vendor ID'),
      status: z
        .enum(['draft', 'open', 'overdue', 'paid', 'void', 'partially_paid'])
        .optional(),
      searchText: z.string().optional(),
      dateFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      bills: z.array(
        z.object({
          billId: z.string(),
          billNumber: z.string().optional(),
          vendorName: z.string().optional(),
          vendorId: z.string().optional(),
          status: z.string().optional(),
          date: z.string().optional(),
          dueDate: z.string().optional(),
          total: z.number().optional(),
          balance: z.number().optional(),
          currencyCode: z.string().optional(),
          createdTime: z.string().optional()
        })
      ),
      pageContext: z
        .object({
          page: z.number(),
          perPage: z.number(),
          hasMorePage: z.boolean()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let query: Record<string, any> = { page: ctx.input.page, per_page: ctx.input.perPage };
    if (ctx.input.vendorId) query.vendor_id = ctx.input.vendorId;
    if (ctx.input.status) query.status = ctx.input.status;
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;
    if (ctx.input.dateFrom) query.date_start = ctx.input.dateFrom;
    if (ctx.input.dateTo) query.date_end = ctx.input.dateTo;

    let resp = await client.listBills(query);
    let bills = (resp.bills || []).map((b: any) => ({
      billId: b.bill_id,
      billNumber: b.bill_number,
      vendorName: b.vendor_name,
      vendorId: b.vendor_id,
      status: b.status,
      date: b.date,
      dueDate: b.due_date,
      total: b.total,
      balance: b.balance,
      currencyCode: b.currency_code,
      createdTime: b.created_time
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { bills, pageContext },
      message: `Found **${bills.length}** bill(s) on page ${ctx.input.page}.`
    };
  })
  .build();

export let createBillTool = SlateTool.create(spec, {
  name: 'Create Bill',
  key: 'create_bill',
  description: `Create a new bill from a vendor with line items. Bills represent amounts owed to vendors for goods or services received.`,
  instructions: [
    'Provide a vendorId and at least one line item with an accountId and amount.',
    'Each line item should reference an expense account via accountId.'
  ]
})
  .input(
    z.object({
      vendorId: z.string().describe('ID of the vendor'),
      billNumber: z.string().optional(),
      referenceNumber: z.string().optional(),
      date: z.string().optional().describe('Bill date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
      lineItems: z
        .array(
          z.object({
            accountId: z.string().optional().describe('Expense account ID'),
            itemId: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().optional().default(1),
            rate: z.number().optional(),
            taxId: z.string().optional()
          })
        )
        .min(1),
      notes: z.string().optional(),
      terms: z.string().optional()
    })
  )
  .output(
    z.object({
      billId: z.string(),
      billNumber: z.string().optional(),
      status: z.string().optional(),
      total: z.number().optional(),
      balance: z.number().optional(),
      currencyCode: z.string().optional(),
      createdTime: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      vendor_id: input.vendorId,
      line_items: input.lineItems.map(li => ({
        account_id: li.accountId,
        item_id: li.itemId,
        name: li.name,
        description: li.description,
        quantity: li.quantity,
        rate: li.rate,
        tax_id: li.taxId
      }))
    };

    if (input.billNumber) payload.bill_number = input.billNumber;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.date) payload.date = input.date;
    if (input.dueDate) payload.due_date = input.dueDate;
    if (input.notes) payload.notes = input.notes;
    if (input.terms) payload.terms = input.terms;

    let resp = await client.createBill(payload);
    let bill = resp.bill;

    return {
      output: {
        billId: bill.bill_id,
        billNumber: bill.bill_number,
        status: bill.status,
        total: bill.total,
        balance: bill.balance,
        currencyCode: bill.currency_code,
        createdTime: bill.created_time
      },
      message: `Created bill **${bill.bill_number}** for ${bill.currency_code} ${bill.total}.`
    };
  })
  .build();

export let updateBillStatusTool = SlateTool.create(spec, {
  name: 'Update Bill Status',
  key: 'update_bill_status',
  description: `Change the status of a bill — mark it as open or void.`
})
  .input(
    z.object({
      billId: z.string().describe('ID of the bill'),
      action: z.enum(['mark_open', 'mark_void']).describe('Status action to perform')
    })
  )
  .output(
    z.object({
      billId: z.string(),
      status: z.string().optional(),
      billNumber: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { billId, action } = ctx.input;

    if (action === 'mark_open') await client.markBillOpen(billId);
    else if (action === 'mark_void') await client.markBillVoid(billId);

    let resp = await client.getBill(billId);
    let bill = resp.bill;

    return {
      output: {
        billId: bill.bill_id,
        status: bill.status,
        billNumber: bill.bill_number
      },
      message: `Bill **${bill.bill_number}** — action: ${action}, status: ${bill.status}.`
    };
  })
  .build();
