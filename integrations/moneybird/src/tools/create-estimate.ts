import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate (quote/proposal) in Moneybird. Add line items with descriptions, quantities, and prices. The estimate is created as a draft. Use "Manage Estimate" to send, accept, reject, or convert it to an invoice.`,
  instructions: ['Provide a contactId and at least one line item.']
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to send the estimate to'),
      estimateDate: z.string().optional().describe('Estimate date (YYYY-MM-DD)'),
      dueDate: z.string().optional().describe('Expiry/due date (YYYY-MM-DD)'),
      reference: z.string().optional().describe('Custom reference'),
      currency: z.string().optional().describe('ISO currency code'),
      language: z.string().optional().describe('Language code (nl, en)'),
      discount: z.string().optional().describe('Discount percentage'),
      pricesAreInclTax: z.boolean().optional().describe('Whether prices include tax'),
      workflowId: z.string().optional().describe('Workflow ID'),
      documentStyleId: z.string().optional().describe('Document style ID'),
      preText: z.string().optional().describe('Text above the line items'),
      postText: z.string().optional().describe('Text below the line items'),
      lineItems: z
        .array(
          z.object({
            description: z.string().optional().describe('Line item description'),
            amount: z.string().optional().describe('Quantity'),
            price: z.string().optional().describe('Unit price'),
            taxRateId: z.string().optional().describe('Tax rate ID'),
            ledgerAccountId: z.string().optional().describe('Ledger account ID'),
            productId: z.string().optional().describe('Product ID')
          })
        )
        .describe('Estimate line items')
    })
  )
  .output(
    z.object({
      estimateId: z.string(),
      estimateNumber: z.string().nullable(),
      state: z.string(),
      totalPriceInclTax: z.string().nullable(),
      totalPriceExclTax: z.string().nullable(),
      url: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let estimateData: Record<string, any> = {
      contact_id: ctx.input.contactId,
      details_attributes: ctx.input.lineItems.map((item, i) => {
        let detail: Record<string, any> = {};
        if (item.description) detail.description = item.description;
        if (item.amount) detail.amount = item.amount;
        if (item.price) detail.price = item.price;
        if (item.taxRateId) detail.tax_rate_id = item.taxRateId;
        if (item.ledgerAccountId) detail.ledger_account_id = item.ledgerAccountId;
        if (item.productId) detail.product_id = item.productId;
        detail.row_order = i + 1;
        return detail;
      })
    };

    if (ctx.input.estimateDate) estimateData.estimate_date = ctx.input.estimateDate;
    if (ctx.input.dueDate) estimateData.due_date = ctx.input.dueDate;
    if (ctx.input.reference) estimateData.reference = ctx.input.reference;
    if (ctx.input.currency) estimateData.currency = ctx.input.currency;
    if (ctx.input.language) estimateData.language = ctx.input.language;
    if (ctx.input.discount) estimateData.discount = ctx.input.discount;
    if (ctx.input.pricesAreInclTax !== undefined)
      estimateData.prices_are_incl_tax = ctx.input.pricesAreInclTax;
    if (ctx.input.workflowId) estimateData.workflow_id = ctx.input.workflowId;
    if (ctx.input.documentStyleId) estimateData.document_style_id = ctx.input.documentStyleId;
    if (ctx.input.preText) estimateData.pre_text = ctx.input.preText;
    if (ctx.input.postText) estimateData.post_text = ctx.input.postText;

    let estimate = await client.createEstimate(estimateData);

    return {
      output: {
        estimateId: String(estimate.id),
        estimateNumber: estimate.estimate_id || null,
        state: estimate.state || 'draft',
        totalPriceInclTax: estimate.total_price_incl_tax || null,
        totalPriceExclTax: estimate.total_price_excl_tax || null,
        url: estimate.url || null
      },
      message: `Created estimate **${estimate.estimate_id || estimate.id}** for ${estimate.total_price_incl_tax || '0.00'} ${estimate.currency || 'EUR'}.`
    };
  });
