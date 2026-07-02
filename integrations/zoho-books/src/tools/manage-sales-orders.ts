import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSalesOrdersTool = SlateTool.create(spec, {
  name: 'List Sales Orders',
  key: 'list_sales_orders',
  description: `Search and list sales orders with filtering by status, customer, and date range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().optional(),
      status: z
        .enum(['draft', 'open', 'invoiced', 'partially_invoiced', 'void', 'overdue'])
        .optional(),
      searchText: z.string().optional(),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(200)
    })
  )
  .output(
    z.object({
      salesOrders: z.array(
        z.object({
          salesorderId: z.string(),
          salesorderNumber: z.string().optional(),
          customerName: z.string().optional(),
          customerId: z.string().optional(),
          status: z.string().optional(),
          date: z.string().optional(),
          total: z.number().optional(),
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
    if (ctx.input.customerId) query.customer_id = ctx.input.customerId;
    if (ctx.input.status) query.status = ctx.input.status;
    if (ctx.input.searchText) query.search_text = ctx.input.searchText;

    let resp = await client.listSalesOrders(query);
    let salesOrders = (resp.salesorders || []).map((so: any) => ({
      salesorderId: so.salesorder_id,
      salesorderNumber: so.salesorder_number,
      customerName: so.customer_name,
      customerId: so.customer_id,
      status: so.status,
      date: so.date,
      total: so.total,
      currencyCode: so.currency_code,
      createdTime: so.created_time
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { salesOrders, pageContext },
      message: `Found **${salesOrders.length}** sales order(s).`
    };
  })
  .build();

export let createSalesOrderTool = SlateTool.create(spec, {
  name: 'Create Sales Order',
  key: 'create_sales_order',
  description: `Create a new sales order for a customer with line items. Can optionally convert to an invoice.`
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer'),
      salesorderNumber: z.string().optional(),
      referenceNumber: z.string().optional(),
      date: z.string().optional().describe('Sales order date (YYYY-MM-DD)'),
      shipmentDate: z.string().optional().describe('Expected shipment date (YYYY-MM-DD)'),
      lineItems: z
        .array(
          z.object({
            itemId: z.string().optional(),
            name: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().optional().default(1),
            rate: z.number().optional(),
            taxId: z.string().optional(),
            discount: z.number().optional()
          })
        )
        .min(1),
      discount: z.number().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      convertToInvoice: z.boolean().optional().default(false)
    })
  )
  .output(
    z.object({
      salesorderId: z.string(),
      salesorderNumber: z.string().optional(),
      status: z.string().optional(),
      total: z.number().optional(),
      currencyCode: z.string().optional(),
      convertedInvoiceId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let input = ctx.input;

    let payload: Record<string, any> = {
      customer_id: input.customerId,
      line_items: input.lineItems.map(li => ({
        item_id: li.itemId,
        name: li.name,
        description: li.description,
        quantity: li.quantity,
        rate: li.rate,
        tax_id: li.taxId,
        discount: li.discount
      }))
    };

    if (input.salesorderNumber) payload.salesorder_number = input.salesorderNumber;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.date) payload.date = input.date;
    if (input.shipmentDate) payload.shipment_date = input.shipmentDate;
    if (input.discount !== undefined) payload.discount = input.discount;
    if (input.notes) payload.notes = input.notes;
    if (input.terms) payload.terms = input.terms;

    let resp = await client.createSalesOrder(payload);
    let so = resp.salesorder;

    let convertedInvoiceId: string | undefined;
    if (input.convertToInvoice && so.salesorder_id) {
      let convResp = await client.convertSalesOrderToInvoice(so.salesorder_id);
      convertedInvoiceId = convResp.invoice?.invoice_id;
    }

    return {
      output: {
        salesorderId: so.salesorder_id,
        salesorderNumber: so.salesorder_number,
        status: so.status,
        total: so.total,
        currencyCode: so.currency_code,
        convertedInvoiceId
      },
      message: `Created sales order **${so.salesorder_number}** for ${so.currency_code} ${so.total}.${convertedInvoiceId ? ` Converted to invoice ${convertedInvoiceId}.` : ''}`
    };
  })
  .build();
