import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let adjustmentLineSchema = z.object({
  itemId: z.string().describe('Item ID to adjust'),
  quantityAdjusted: z
    .number()
    .describe('Quantity to adjust (positive to increase, negative to decrease)'),
  warehouseId: z.string().optional().describe('Warehouse ID for the adjustment'),
  description: z.string().optional().describe('Line item description')
});

export let recordInventoryAdjustment = SlateTool.create(spec, {
  name: 'Record Inventory Adjustment',
  key: 'record_inventory_adjustment',
  description: `Record an inventory quantity adjustment. Use to correct stock levels, account for damaged goods, or make other inventory corrections.
Supports multiple line items per adjustment and per-warehouse adjustments.`,
  instructions: [
    'Provide a date, reason, and at least one line item with an itemId and quantityAdjusted.',
    'Use positive quantityAdjusted to add stock, negative to reduce.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Adjustment date (YYYY-MM-DD)'),
      reason: z.string().describe('Reason for the adjustment'),
      adjustmentType: z
        .enum(['quantity', 'value'])
        .optional()
        .describe('Adjustment type (default: quantity)'),
      referenceNumber: z.string().optional().describe('Reference number'),
      description: z.string().optional().describe('Adjustment description'),
      lineItems: z.array(adjustmentLineSchema).describe('Items to adjust')
    })
  )
  .output(
    z.object({
      adjustmentId: z.string().describe('Inventory adjustment ID'),
      referenceNumber: z.string().optional().describe('Reference number'),
      date: z.string().optional().describe('Adjustment date'),
      reason: z.string().optional().describe('Reason'),
      status: z.string().optional().describe('Adjustment status'),
      totalAmount: z.number().optional().describe('Total adjustment amount')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      date: ctx.input.date,
      reason: ctx.input.reason,
      line_items: ctx.input.lineItems.map(li => {
        let item: Record<string, any> = {
          item_id: li.itemId,
          quantity_adjusted: li.quantityAdjusted
        };
        if (li.warehouseId !== undefined) item.warehouse_id = li.warehouseId;
        if (li.description !== undefined) item.description = li.description;
        return item;
      })
    };

    if (ctx.input.adjustmentType !== undefined)
      body.adjustment_type = ctx.input.adjustmentType;
    if (ctx.input.referenceNumber !== undefined)
      body.reference_number = ctx.input.referenceNumber;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;

    let result = await client.createInventoryAdjustment(body);
    let adj = result.inventory_adjustment;

    return {
      output: {
        adjustmentId: String(adj.inventory_adjustment_id),
        referenceNumber: adj.reference_number ?? undefined,
        date: adj.date ?? undefined,
        reason: adj.reason ?? undefined,
        status: adj.status ?? undefined,
        totalAmount: adj.total ?? undefined
      },
      message: `Inventory adjustment **${adj.inventory_adjustment_id}** recorded. Reason: ${adj.reason}.`
    };
  })
  .build();
