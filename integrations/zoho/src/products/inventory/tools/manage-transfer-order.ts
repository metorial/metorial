import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient, organizationIdSchema } from '../lib/helpers';

let transferLineSchema = z.object({
  itemId: z.string().describe('Item ID'),
  quantity: z.number().positive().describe('Quantity to transfer'),
  name: z.string().optional().describe('Item name; retrieved from the item when omitted')
});

export let manageTransferOrder = SlateTool.create(spec, {
  name: 'Inventory Manage Transfer Order',
  key: 'inventory_manage_transfer_order',
  description: `Create or update a transfer order to move stock between warehouses. You can also mark a transfer as received.
Use without a **transferOrderId** to create, or with one to update. Set **markReceived** to true to mark the transfer as received.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organizationId: organizationIdSchema,
      fromLocationId: z
        .string()
        .optional()
        .describe('Source location ID. Call inventory_list_locations to discover locations.'),
      toLocationId: z
        .string()
        .optional()
        .describe(
          'Destination location ID. Call inventory_list_locations to discover locations.'
        ),
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
          fromWarehouseName: to.from_location_name ?? to.from_warehouse_name ?? undefined,
          toWarehouseName: to.to_location_name ?? to.to_warehouse_name ?? undefined,
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
    if (ctx.input.notes !== undefined) body.description = ctx.input.notes;
    if (ctx.input.fromLocationId) body.from_location_id = ctx.input.fromLocationId;
    if (ctx.input.toLocationId) body.to_location_id = ctx.input.toLocationId;

    if (ctx.input.lineItems) {
      body.line_items = await Promise.all(
        ctx.input.lineItems.map(async li => ({
          item_id: li.itemId,
          name: li.name ?? (await client.getItem(li.itemId)).item.name,
          quantity_transfer: li.quantity
        }))
      );
    }

    let result: any;
    let action: string;

    if (ctx.input.transferOrderId) {
      result = await client.updateTransferOrder(ctx.input.transferOrderId, body);
      action = 'updated';
    } else {
      if (
        !ctx.input.date ||
        !ctx.input.lineItems?.length ||
        (!(ctx.input.fromLocationId && ctx.input.toLocationId) &&
          !(ctx.input.fromWarehouseId && ctx.input.toWarehouseId))
      ) {
        throw createApiServiceError(
          'Creating a transfer requires date, lineItems, and source/destination locations (or warehouses for a multi-warehouse organization).'
        );
      }
      result = await client.createTransferOrder(body);
      action = 'created';
    }

    let to = result.transfer_order;

    return {
      output: {
        transferOrderId: String(to.transfer_order_id),
        transferOrderNumber: to.transfer_order_number ?? undefined,
        fromWarehouseName: to.from_location_name ?? to.from_warehouse_name ?? undefined,
        toWarehouseName: to.to_location_name ?? to.to_warehouse_name ?? undefined,
        status: to.status ?? undefined,
        date: to.date ?? undefined
      },
      message: `Transfer order **${to.transfer_order_number}** ${action} successfully.`
    };
  })
  .build();
