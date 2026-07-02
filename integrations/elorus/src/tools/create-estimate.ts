import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  title: z.string().describe('Title/name of the line item.'),
  description: z.string().optional().describe('Line item description.'),
  quantity: z.string().optional().describe('Quantity (as string). Defaults to "1".'),
  unitTotal: z
    .string()
    .optional()
    .describe('Unit price including tax (when calculatorMode is "total").'),
  unitValue: z
    .string()
    .optional()
    .describe('Unit price excluding tax (when calculatorMode is "initial").'),
  unit: z.string().optional().describe('Unit of measurement.'),
  productId: z.string().optional().describe('Optional product/service ID.'),
  taxes: z.array(z.string()).optional().describe('Array of tax IDs to apply.')
});

export let createEstimate = SlateTool.create(spec, {
  name: 'Create Estimate',
  key: 'create_estimate',
  description: `Create a new estimate (quote/pro-forma invoice) in Elorus. Estimates can later be converted to invoices.`
})
  .input(
    z.object({
      clientId: z.string().describe('Contact ID of the client.'),
      documentTypeId: z.string().describe('Document type ID for the estimate.'),
      date: z.string().optional().describe('Estimate date (YYYY-MM-DD). Defaults to today.'),
      calculatorMode: z
        .enum(['total', 'initial'])
        .optional()
        .describe('"total" or "initial" pricing mode. Defaults to "total".'),
      currencyCode: z.string().optional().describe('Currency code (e.g. "EUR").'),
      items: z.array(lineItemSchema).describe('Line items for the estimate.'),
      reference: z.string().optional().describe('Reference or PO number.'),
      customId: z.string().optional().describe('Custom external identifier (API-only).')
    })
  )
  .output(
    z.object({
      estimate: z.any().describe('The newly created estimate object.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: any = {
      client: ctx.input.clientId,
      documenttype: ctx.input.documentTypeId,
      calculator_mode: ctx.input.calculatorMode || 'total',
      items: ctx.input.items.map(item => {
        let lineItem: any = { title: item.title };
        if (item.description) lineItem.description = item.description;
        if (item.quantity) lineItem.quantity = item.quantity;
        if (item.unitTotal) lineItem.unit_total = item.unitTotal;
        if (item.unitValue) lineItem.unit_value = item.unitValue;
        if (item.unit) lineItem.unit = item.unit;
        if (item.productId) lineItem.product = item.productId;
        if (item.taxes) lineItem.taxes = item.taxes;
        return lineItem;
      })
    };

    if (ctx.input.date) body.date = ctx.input.date;
    if (ctx.input.currencyCode) body.currency_code = ctx.input.currencyCode;
    if (ctx.input.reference) body.reference = ctx.input.reference;
    if (ctx.input.customId) body.custom_id = ctx.input.customId;

    let estimate = await client.createEstimate(body);

    return {
      output: { estimate },
      message: `Created estimate **${estimate.sequence_flat || estimate.id}** — Total: ${estimate.total} ${estimate.currency_code || ''}`
    };
  })
  .build();
