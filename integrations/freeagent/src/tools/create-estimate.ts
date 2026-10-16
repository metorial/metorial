import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

let estimateItemSchema = z.object({
  itemType: z
    .enum([
      'Hours',
      'Days',
      'Weeks',
      'Months',
      'Years',
      'Products',
      'Services',
      'Training',
      'Expenses',
      'Comment',
      'Discount',
      'Credit',
      'No Unit'
    ])
    .optional()
    .describe('Type of estimate item'),
  quantity: z.number().optional().describe('Quantity'),
  price: z.string().optional().describe('Price per unit'),
  description: z.string().optional().describe('Line item description'),
  category: z.string().optional().describe('Category URL or nominal code'),
  salesTaxRate: z.string().optional().describe('Sales tax rate')
});

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate (quote) in FreeAgent for a contact. Estimates can later be converted to invoices.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to create the estimate for'),
      datedOn: z.string().describe('Estimate date in YYYY-MM-DD format'),
      reference: z.string().optional().describe('Estimate reference number'),
      projectId: z.string().optional().describe('Project ID to associate with'),
      currency: z.string().optional().describe('Currency code'),
      paymentTermsInDays: z.number().optional().describe('Payment terms in days'),
      comments: z.string().optional().describe('Additional notes on the estimate'),
      estimateType: z
        .enum(['Estimate', 'Quote', 'Proposal'])
        .optional()
        .describe('Type of estimate'),
      status: z
        .enum(['Draft', 'Sent', 'Open', 'Approved', 'Rejected', 'Invoiced'])
        .optional()
        .describe('Estimate status'),
      estimateItems: z
        .array(estimateItemSchema)
        .optional()
        .describe('Line items for the estimate')
    })
  )
  .output(
    z.object({
      estimate: z.record(z.string(), z.any()).describe('The newly created estimate')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.paymentTermsInDays !== undefined) {
      throw createApiServiceError(
        'FreeAgent estimates do not document payment terms. Omit paymentTermsInDays and set terms when creating the invoice.'
      );
    }

    let client = createClient(ctx);

    let estimateData: Record<string, any> = {
      contact: ctx.input.contactId,
      dated_on: ctx.input.datedOn
    };

    if (ctx.input.estimateType) estimateData.estimate_type = ctx.input.estimateType;
    if (ctx.input.status) estimateData.status = ctx.input.status;
    if (ctx.input.reference) estimateData.reference = ctx.input.reference;
    if (ctx.input.projectId) estimateData.project = ctx.input.projectId;
    if (ctx.input.currency) estimateData.currency = ctx.input.currency;

    if (ctx.input.comments) estimateData.notes = ctx.input.comments;

    if (ctx.input.estimateItems && ctx.input.estimateItems.length > 0) {
      estimateData.estimate_items = ctx.input.estimateItems.map(item => {
        let mapped: Record<string, any> = {};
        if (item.itemType)
          mapped.item_type =
            item.itemType === 'No Unit'
              ? '-no unit-'
              : item.itemType === 'Comment'
                ? 'Comments'
                : item.itemType;
        if (item.quantity !== undefined) mapped.quantity = item.quantity;
        if (item.price) mapped.price = item.price;
        if (item.description) mapped.description = item.description;
        if (item.category) mapped.category = item.category;
        if (item.salesTaxRate) mapped.sales_tax_rate = item.salesTaxRate;
        return mapped;
      });
    }

    let estimate = await client.createEstimate(estimateData);

    return {
      output: { estimate },
      message: `Created estimate **${estimate.reference || 'N/A'}** dated ${ctx.input.datedOn}`
    };
  })
  .build();
