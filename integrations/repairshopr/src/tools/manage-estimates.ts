import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let estimateSchema = z.object({
  estimateId: z.number().describe('Estimate ID'),
  number: z.string().optional().describe('Estimate number'),
  customerId: z.number().optional().describe('Customer ID'),
  customerName: z.string().optional().describe('Customer name'),
  ticketId: z.number().optional().describe('Associated ticket ID'),
  date: z.string().optional().describe('Estimate date'),
  subtotal: z.number().optional().describe('Subtotal amount'),
  total: z.number().optional().describe('Total amount'),
  tax: z.number().optional().describe('Tax amount'),
  status: z.string().optional().describe('Estimate status'),
  notes: z.string().optional().describe('Estimate notes'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapEstimate = (e: any) => ({
  estimateId: e.id,
  number: e.number?.toString(),
  customerId: e.customer_id,
  customerName: e.customer_business_then_name || e.customer?.fullname,
  ticketId: e.ticket_id,
  date: e.date,
  subtotal: e.subtotal ? Number(e.subtotal) : undefined,
  total: e.total ? Number(e.total) : undefined,
  tax: e.tax ? Number(e.tax) : undefined,
  status: e.status,
  notes: e.notes,
  createdAt: e.created_at,
  updatedAt: e.updated_at
});

export let searchEstimates = SlateTool.create(spec, {
  name: 'Search Estimates',
  key: 'search_estimates',
  description: `Search and list estimates/quotes. Filter by customer, status, or date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.number().optional().describe('Filter by customer ID'),
      status: z.string().optional().describe('Filter by status'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter estimates created before this date (YYYY-MM-DD)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter estimates created after this date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      estimates: z.array(estimateSchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listEstimates(ctx.input);
    let estimates = (result.estimates || []).map(mapEstimate);

    return {
      output: {
        estimates,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${estimates.length}** estimate(s).`
    };
  })
  .build();

export let getEstimate = SlateTool.create(spec, {
  name: 'Get Estimate',
  key: 'get_estimate',
  description: `Retrieve detailed information about a specific estimate/quote.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      estimateId: z.number().describe('The estimate ID to retrieve')
    })
  )
  .output(estimateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getEstimate(ctx.input.estimateId);
    let e = result.estimate || result;

    return {
      output: mapEstimate(e),
      message: `Retrieved estimate **#${e.number || e.id}** — Total: $${e.total || 0}.`
    };
  })
  .build();

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate/quote for a customer. Customers can approve or decline estimates via email.`
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID for the estimate'),
      ticketId: z.number().optional().describe('Ticket ID to link the estimate to'),
      number: z.string().optional().describe('Custom estimate number'),
      date: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
      notes: z.string().optional().describe('Notes to include on the estimate'),
      lineItems: z
        .array(
          z.object({
            name: z.string().optional().describe('Item name'),
            description: z.string().optional().describe('Item description'),
            quantity: z.number().optional().describe('Quantity'),
            price: z.number().optional().describe('Unit price'),
            taxable: z.boolean().optional().describe('Whether item is taxable'),
            productId: z.number().optional().describe('Product ID from inventory')
          })
        )
        .optional()
        .describe('Line items for the estimate')
    })
  )
  .output(estimateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createEstimate(ctx.input);
    let e = result.estimate || result;

    return {
      output: mapEstimate(e),
      message: `Created estimate **#${e.number || e.id}** for customer ${e.customer_id}.`
    };
  })
  .build();

export let updateEstimate = SlateTool.create(spec, {
  name: 'Update Estimate',
  key: 'update_estimate',
  description: `Update an existing estimate's notes, date, or status.`
})
  .input(
    z.object({
      estimateId: z.number().describe('The estimate ID to update'),
      notes: z.string().optional().describe('Updated notes'),
      date: z.string().optional().describe('Updated estimate date (YYYY-MM-DD)'),
      status: z.string().optional().describe('Updated status')
    })
  )
  .output(estimateSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { estimateId, ...updateData } = ctx.input;
    let result = await client.updateEstimate(estimateId, updateData);
    let e = result.estimate || result;

    return {
      output: mapEstimate(e),
      message: `Updated estimate **#${e.number || e.id}**.`
    };
  })
  .build();
