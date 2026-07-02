import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let transferLineSchema = z.object({
  itemId: z.string().describe('Item ID'),
  quantity: z.number().describe('Quantity to transfer')
});

export let manageTransferOrder = SlateTool.create(spec, {
  name: 'Manage Transfer Order',
  key: 'manage_transfer_order',
  description: `Create or update a transfer order to move stock between warehouses. You can also mark a transfer as received.
Use without a **transferOrderId** to create, or with one to update. Set **markReceived** to true to mark the transfer as received.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      transferOrderId: z
        .string()
        .optional()
        .describe('Transfer order ID to update. Omit to create.'),
      fromWarehouseId: z
        .string()
        .optional()
        .describe('Source warehouse ID (required for creation)'),
      toWarehouseId: z
        .string()
        .optional()
        .describe('Destination warehouse ID (required for creation)'),
      date: z.string().optional().describe('Transfer date (YYYY-MM-DD)'),
      transferOrderNumber: z.string().optional().describe('Custom transfer order number'),
      referenceNumber: z.string().optional().describe('Reference number'),
      lineItems: z.array(transferLineSchema).optional().describe('Items to transfer'),
      notes: z.string().optional().describe('Notes'),
      markReceived: z
        .boolean()
        .optional()
        .describe('Set to true to mark an existing transfer as received')
    })
  )
  .output(
    z.object({
      transferOrderId: z.string().describe('Transfer order ID'),
      transferOrderNumber: z.string().optional().describe('Transfer order number'),
      fromWarehouseName: z.string().optional().describe('Source warehouse'),
      toWarehouseName: z.string().optional().describe('Destination warehouse'),
      status: z.string().optional().describe('Transfer status'),
      date: z.string().optional().describe('Transfer date')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.transferOrderId && ctx.input.markReceived) {
      await client.markTransferOrderReceived(ctx.input.transferOrderId);
      let result = await client.getTransferOrder(ctx.input.transferOrderId);
      let to = result.transfer_order;
      return {
        output: {
          transferOrderId: String(to.transfer_order_id),
          transferOrderNumber: to.transfer_order_number ?? undefined,
          fromWarehouseName: to.from_warehouse_name ?? undefined,
          toWarehouseName: to.to_warehouse_name ?? undefined,
          status: to.status ?? undefined,
          date: to.date ?? undefined
        },
        message: `Transfer order **${to.transfer_order_number}** marked as received.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.fromWarehouseId !== undefined)
      body.from_warehouse_id = ctx.input.fromWarehouseId;
    if (ctx.input.toWarehouseId !== undefined) body.to_warehouse_id = ctx.input.toWarehouseId;
    if (ctx.input.date !== undefined) body.date = ctx.input.date;
    if (ctx.input.transferOrderNumber !== undefined)
      body.transfer_order_number = ctx.input.transferOrderNumber;
    if (ctx.input.referenceNumber !== undefined)
      body.reference_number = ctx.input.referenceNumber;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;

    if (ctx.input.lineItems) {
      body.line_items = ctx.input.lineItems.map(li => ({
        item_id: li.itemId,
        quantity: li.quantity
      }));
    }

    let result: any;
    let action: string;

    if (ctx.input.transferOrderId) {
      result = await client.updateTransferOrder(ctx.input.transferOrderId, body);
      action = 'updated';
    } else {
      result = await client.createTransferOrder(body);
      action = 'created';
    }

    let to = result.transfer_order;

    return {
      output: {
        transferOrderId: String(to.transfer_order_id),
        transferOrderNumber: to.transfer_order_number ?? undefined,
        fromWarehouseName: to.from_warehouse_name ?? undefined,
        toWarehouseName: to.to_warehouse_name ?? undefined,
        status: to.status ?? undefined,
        date: to.date ?? undefined
      },
      message: `Transfer order **${to.transfer_order_number}** ${action} successfully.`
    };
  })
  .build();
