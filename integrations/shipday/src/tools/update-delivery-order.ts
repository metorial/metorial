import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

let orderItemSchema = z.object({
  name: z.string().describe('Name of the item'),
  quantity: z.number().describe('Quantity of the item'),
  unitPrice: z.number().optional().describe('Unit price of the item'),
  addOns: z.string().optional().describe('Add-ons or modifications'),
  detail: z.string().optional().describe('Additional details')
});

export let updateDeliveryOrder = SlateTool.create(spec, {
  name: 'Update Delivery Order',
  key: 'update_delivery_order',
  description: `Updates an existing delivery order in Shipday. Can modify customer/restaurant details, order items, pricing, timing, and delivery instructions. Can also update the order status, mark as ready for pickup, or assign/unassign a carrier.`,
  instructions: [
    'Use orderId to identify the order to update.',
    'To change order status, provide the status field.',
    'To assign a carrier, provide carrierId. To unassign, set unassignCarrier to true.',
    'To mark as ready for pickup, set readyToPickup to true.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('Unique Shipday order ID'),

      // Edit fields
      orderNumber: z.string().optional().describe('Updated order number'),
      customerName: z.string().optional().describe('Updated customer name'),
      customerAddress: z.string().optional().describe('Updated customer address'),
      customerEmail: z.string().optional().describe('Updated customer email'),
      customerPhoneNumber: z.string().optional().describe('Updated customer phone number'),
      restaurantName: z.string().optional().describe('Updated restaurant name'),
      restaurantAddress: z.string().optional().describe('Updated restaurant address'),
      restaurantPhoneNumber: z.string().optional().describe('Updated restaurant phone'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .describe('Updated delivery date (yyyy-mm-dd)'),
      expectedPickupTime: z.string().optional().describe('Updated pickup time (hh:mm:ss)'),
      expectedDeliveryTime: z.string().optional().describe('Updated delivery time (hh:mm:ss)'),
      orderItems: z.array(orderItemSchema).optional().describe('Updated order items'),
      tip: z.number().optional().describe('Updated tip amount'),
      tax: z.number().optional().describe('Updated tax amount'),
      discountAmount: z.number().optional().describe('Updated discount amount'),
      deliveryFee: z.number().optional().describe('Updated delivery fee'),
      totalCost: z.string().optional().describe('Updated total order cost'),
      deliveryInstruction: z.string().optional().describe('Updated delivery instructions'),
      paymentMethod: z
        .enum(['cash', 'credit_card'])
        .optional()
        .describe('Updated payment method'),

      // Status update
      status: z
        .enum([
          'STARTED',
          'PICKED_UP',
          'READY_TO_DELIVER',
          'ALREADY_DELIVERED',
          'INCOMPLETE',
          'FAILED_DELIVERY'
        ])
        .optional()
        .describe('New order status'),

      // Ready to pickup
      readyToPickup: z.boolean().optional().describe('Mark order as ready for pickup'),

      // Carrier assignment
      carrierId: z.number().optional().describe('Carrier ID to assign the order to'),
      unassignCarrier: z
        .boolean()
        .optional()
        .describe('Unassign the currently assigned carrier')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      actions: z.array(z.string()).describe('List of actions performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShipdayClient({ token: ctx.auth.token });
    let actions: string[] = [];

    // Edit order details if any edit fields are provided
    let editFields: Record<string, unknown> = {};
    let editKeys = [
      'orderNumber',
      'customerName',
      'customerAddress',
      'customerEmail',
      'customerPhoneNumber',
      'restaurantName',
      'restaurantAddress',
      'restaurantPhoneNumber',
      'expectedDeliveryDate',
      'expectedPickupTime',
      'expectedDeliveryTime',
      'tip',
      'tax',
      'discountAmount',
      'deliveryFee',
      'totalCost',
      'deliveryInstruction',
      'paymentMethod'
    ] as const;

    for (let key of editKeys) {
      let value = ctx.input[key];
      if (value !== undefined) {
        if (key === 'orderNumber') {
          editFields.orderNo = value;
        } else {
          editFields[key] = value;
        }
      }
    }

    if (ctx.input.orderItems) {
      editFields.orderItems = ctx.input.orderItems;
    }

    if (Object.keys(editFields).length > 0) {
      await client.editDeliveryOrder(ctx.input.orderId, editFields);
      actions.push('Updated order details');
    }

    // Update status
    if (ctx.input.status) {
      await client.updateOrderStatus(ctx.input.orderId, ctx.input.status);
      actions.push(`Updated status to ${ctx.input.status}`);
    }

    // Mark ready to pickup
    if (ctx.input.readyToPickup !== undefined) {
      await client.markOrderReadyToPickup(ctx.input.orderId, ctx.input.readyToPickup);
      actions.push(
        ctx.input.readyToPickup ? 'Marked as ready for pickup' : 'Unmarked ready for pickup'
      );
    }

    // Carrier assignment
    if (ctx.input.unassignCarrier) {
      await client.unassignOrderFromCarrier(ctx.input.orderId);
      actions.push('Unassigned carrier');
    } else if (ctx.input.carrierId) {
      await client.assignOrderToCarrier(ctx.input.orderId, ctx.input.carrierId);
      actions.push(`Assigned to carrier ${ctx.input.carrierId}`);
    }

    return {
      output: {
        success: true,
        actions
      },
      message: `Updated order **${ctx.input.orderId}**: ${actions.join(', ')}.`
    };
  })
  .build();
