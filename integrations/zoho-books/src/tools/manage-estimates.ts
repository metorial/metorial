import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listEstimatesTool = SlateTool.create(spec, {
  name: 'List Estimates',
  key: 'list_estimates',
  description: `Search and list estimates/quotes with filtering by status, customer, and date range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.string().optional().describe('Filter by customer ID'),
      status: z
        .enum(['draft', 'sent', 'invoiced', 'accepted', 'declined', 'expired'])
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
      estimates: z.array(
        z.object({
          estimateId: z.string(),
          estimateNumber: z.string().optional(),
          customerName: z.string().optional(),
          customerId: z.string().optional(),
          status: z.string().optional(),
          date: z.string().optional(),
          expiryDate: z.string().optional(),
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
    if (ctx.input.dateFrom) query.date_start = ctx.input.dateFrom;
    if (ctx.input.dateTo) query.date_end = ctx.input.dateTo;

    let resp = await client.listEstimates(query);
    let estimates = (resp.estimates || []).map((e: any) => ({
      estimateId: e.estimate_id,
      estimateNumber: e.estimate_number,
      customerName: e.customer_name,
      customerId: e.customer_id,
      status: e.status,
      date: e.date,
      expiryDate: e.expiry_date,
      total: e.total,
      currencyCode: e.currency_code,
      createdTime: e.created_time
    }));

    let pageContext = resp.page_context
      ? {
          page: resp.page_context.page,
          perPage: resp.page_context.per_page,
          hasMorePage: resp.page_context.has_more_page
        }
      : undefined;

    return {
      output: { estimates, pageContext },
      message: `Found **${estimates.length}** estimate(s) on page ${ctx.input.page}.`
    };
  })
  .build();

export let createEstimateTool = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate/quote for a customer with line items, taxes, and discounts. Can optionally convert to invoice.`,
  instructions: [
    'Provide a customerId and at least one line item.',
    'Use convertToInvoice to immediately create an invoice from the estimate after creation.'
  ]
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer'),
      estimateNumber: z.string().optional(),
      referenceNumber: z.string().optional(),
      date: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
      expiryDate: z.string().optional().describe('Expiry date (YYYY-MM-DD)'),
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
      salespersonName: z.string().optional(),
      convertToInvoice: z
        .boolean()
        .optional()
        .default(false)
        .describe('Convert the estimate to an invoice immediately')
    })
  )
  .output(
    z.object({
      estimateId: z.string(),
      estimateNumber: z.string().optional(),
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

    if (input.estimateNumber) payload.estimate_number = input.estimateNumber;
    if (input.referenceNumber) payload.reference_number = input.referenceNumber;
    if (input.date) payload.date = input.date;
    if (input.expiryDate) payload.expiry_date = input.expiryDate;
    if (input.discount !== undefined) payload.discount = input.discount;
    if (input.notes) payload.notes = input.notes;
    if (input.terms) payload.terms = input.terms;
    if (input.salespersonName) payload.salesperson_name = input.salespersonName;

    let resp = await client.createEstimate(payload);
    let est = resp.estimate;

    let convertedInvoiceId: string | undefined;
    if (input.convertToInvoice && est.estimate_id) {
      let convResp = await client.convertEstimateToInvoice(est.estimate_id);
      convertedInvoiceId = convResp.invoice?.invoice_id;
    }

    return {
      output: {
        estimateId: est.estimate_id,
        estimateNumber: est.estimate_number,
        status: est.status,
        total: est.total,
        currencyCode: est.currency_code,
        convertedInvoiceId
      },
      message: `Created estimate **${est.estimate_number}** for ${est.currency_code} ${est.total}.${convertedInvoiceId ? ` Converted to invoice ${convertedInvoiceId}.` : ''}`
    };
  })
  .build();

export let updateEstimateStatusTool = SlateTool.create(spec, {
  name: 'Update Estimate Status',
  key: 'update_estimate_status',
  description: `Change the status of an estimate — mark it as sent, accepted, declined, or convert it to an invoice.`
})
  .input(
    z.object({
      estimateId: z.string().describe('ID of the estimate'),
      action: z
        .enum(['mark_sent', 'mark_accepted', 'mark_declined', 'convert_to_invoice'])
        .describe('Action to perform on the estimate')
    })
  )
  .output(
    z.object({
      estimateId: z.string(),
      status: z.string().optional(),
      convertedInvoiceId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { estimateId, action } = ctx.input;
    let convertedInvoiceId: string | undefined;

    if (action === 'mark_sent') await client.markEstimateSent(estimateId);
    else if (action === 'mark_accepted') await client.markEstimateAccepted(estimateId);
    else if (action === 'mark_declined') await client.markEstimateDeclined(estimateId);
    else if (action === 'convert_to_invoice') {
      let convResp = await client.convertEstimateToInvoice(estimateId);
      convertedInvoiceId = convResp.invoice?.invoice_id;
    }

    let resp = await client.getEstimate(estimateId);
    let est = resp.estimate;

    return {
      output: {
        estimateId: est.estimate_id,
        status: est.status,
        convertedInvoiceId
      },
      message: `Estimate **${est.estimate_number}** — action: ${action}, status: ${est.status}.${convertedInvoiceId ? ` Converted to invoice ${convertedInvoiceId}.` : ''}`
    };
  })
  .build();
