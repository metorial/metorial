import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let lineItemSchema = z.object({
  itemId: z.string().optional().describe('ID of an existing item from the items catalog'),
  name: z.string().optional().describe('Name or title of the line item'),
  description: z.string().optional().describe('Description of the line item'),
  rate: z.number().optional().describe('Unit price of the line item'),
  quantity: z.number().optional().describe('Quantity of the line item'),
  unit: z.string().optional().describe('Unit of measurement (e.g. "hrs", "qty")'),
  taxId: z.string().optional().describe('Tax ID to apply to this line item'),
  discount: z
    .string()
    .optional()
    .describe('Discount applied to this line item (e.g. "10%" or "5.00")')
});

export let manageEstimate = SlateTool.create(spec, {
  name: 'Manage Estimate',
  key: 'manage_estimate',
  description: `Create or update an estimate in Zoho Invoice.
If **estimateId** is provided, the existing estimate will be updated.
If **estimateId** is omitted, a new estimate will be created (requires **customerId** and **lineItems**).
Supports line items with pricing, taxes, and discounts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      estimateId: z
        .string()
        .optional()
        .describe('Estimate ID to update. Omit to create a new estimate.'),
      customerId: z
        .string()
        .optional()
        .describe('Customer/contact ID for the estimate (required when creating)'),
      estimateNumber: z.string().optional().describe('Custom estimate number'),
      date: z.string().optional().describe('Estimate date in YYYY-MM-DD format'),
      expiryDate: z.string().optional().describe('Expiry date in YYYY-MM-DD format'),
      lineItems: z
        .array(lineItemSchema)
        .optional()
        .describe('Array of line items for the estimate'),
      notes: z.string().optional().describe('Notes to display on the estimate'),
      terms: z.string().optional().describe('Terms and conditions for the estimate'),
      discount: z
        .string()
        .optional()
        .describe('Discount to apply to the estimate total (e.g. "10%" or "5.00")'),
      discountType: z
        .enum(['entity_level', 'item_level'])
        .optional()
        .describe('How discounts are applied: at entity level or per item')
    })
  )
  .output(
    z.object({
      estimateId: z.string().describe('Unique estimate ID'),
      estimateNumber: z.string().optional().describe('Estimate number'),
      status: z
        .string()
        .optional()
        .describe('Estimate status (draft, sent, invoiced, accepted, declined, expired)'),
      customerId: z.string().optional().describe('Customer/contact ID'),
      customerName: z.string().optional().describe('Customer/contact display name'),
      date: z.string().optional().describe('Estimate date'),
      expiryDate: z.string().optional().describe('Expiry date'),
      total: z.number().optional().describe('Total amount of the estimate'),
      createdTime: z
        .string()
        .optional()
        .describe('ISO timestamp when the estimate was created'),
      lastModifiedTime: z
        .string()
        .optional()
        .describe('ISO timestamp when the estimate was last modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let buildPayload = () => {
      let payload: Record<string, any> = {};

      if (ctx.input.customerId !== undefined) payload.customer_id = ctx.input.customerId;
      if (ctx.input.estimateNumber !== undefined)
        payload.estimate_number = ctx.input.estimateNumber;
      if (ctx.input.date !== undefined) payload.date = ctx.input.date;
      if (ctx.input.expiryDate !== undefined) payload.expiry_date = ctx.input.expiryDate;
      if (ctx.input.notes !== undefined) payload.notes = ctx.input.notes;
      if (ctx.input.terms !== undefined) payload.terms = ctx.input.terms;
      if (ctx.input.discount !== undefined) payload.discount = ctx.input.discount;
      if (ctx.input.discountType !== undefined) payload.discount_type = ctx.input.discountType;

      if (ctx.input.lineItems) {
        payload.line_items = ctx.input.lineItems.map(item => {
          let lineItem: Record<string, any> = {};
          if (item.itemId !== undefined) lineItem.item_id = item.itemId;
          if (item.name !== undefined) lineItem.name = item.name;
          if (item.description !== undefined) lineItem.description = item.description;
          if (item.rate !== undefined) lineItem.rate = item.rate;
          if (item.quantity !== undefined) lineItem.quantity = item.quantity;
          if (item.unit !== undefined) lineItem.unit = item.unit;
          if (item.taxId !== undefined) lineItem.tax_id = item.taxId;
          if (item.discount !== undefined) lineItem.discount = item.discount;
          return lineItem;
        });
      }

      return payload;
    };

    let mapResult = (raw: any) => ({
      estimateId: raw.estimate_id,
      estimateNumber: raw.estimate_number,
      status: raw.status,
      customerId: raw.customer_id,
      customerName: raw.customer_name,
      date: raw.date,
      expiryDate: raw.expiry_date,
      total: raw.total,
      createdTime: raw.created_time,
      lastModifiedTime: raw.last_modified_time
    });

    if (ctx.input.estimateId) {
      let result = await client.updateEstimate(ctx.input.estimateId, buildPayload());
      return {
        output: mapResult(result),
        message: `Updated estimate **#${result.estimate_number}** (ID: ${result.estimate_id}).`
      };
    }

    if (!ctx.input.customerId) {
      throw new Error('customerId is required when creating a new estimate');
    }

    let result = await client.createEstimate(buildPayload());
    return {
      output: mapResult(result),
      message: `Created estimate **#${result.estimate_number}** (ID: ${result.estimate_id}).`
    };
  })
  .build();
