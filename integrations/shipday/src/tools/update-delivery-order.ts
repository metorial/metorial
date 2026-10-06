import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { child, fail, id, items, type Row, text, validateFields } from '../lib/validation';
import { spec } from '../spec';

let orderItemSchema = z.object({
  name: z.string().describe('Name of the item'),
  quantity: z.number().describe('Quantity of the item'),
  unitPrice: z.number().optional().describe('Unit price of the item'),
  addOns: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Add-ons or modifications'),
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
      currentOrderNumber: z
        .string()
        .optional()
        .describe(
          'Current reference required for inactive orders; distinct from the updated orderNumber'
        ),

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
      actions: z.array(z.string()).describe('Confirmed or accepted requests'),
      pendingActions: z
        .array(z.string())
        .optional()
        .describe('Accepted requests whose completed state is not documented or readable'),
      orderId: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    id(input.orderId, 'Order ID');
    validateFields(input);
    if (input.carrierId !== undefined) id(input.carrierId, 'Carrier ID');
    if (input.carrierId !== undefined && input.unassignCarrier)
      fail('Use carrierId or unassignCarrier, not both.');
    const editKeys = [
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
    const editing =
      editKeys.some(key => input[key] !== undefined) || input.orderItems !== undefined;
    if (
      !editing &&
      input.status === undefined &&
      input.readyToPickup === undefined &&
      input.carrierId === undefined &&
      !input.unassignCarrier
    )
      fail('Provide at least one supported update.');
    if (input.orderItems !== undefined) items(input.orderItems);
    const client = new ShipdayClient({ token: ctx.auth.token });
    const before = await client.exactOrder(input.orderId, input.currentOrderNumber);
    let number = text(before.orderNumber, 'Current order number');
    const actions: string[] = [],
      pendingActions: string[] = [];
    let fields: Row | undefined;
    if (editing) {
      const customer = child(before.customer),
        restaurant = child(before.restaurant),
        costing = child(before.costing),
        activity = child(before.activityLog);
      let paymentMethod: string | undefined = input.paymentMethod;
      if (paymentMethod === undefined && before.paymentMethod != null) {
        const current = text(before.paymentMethod, 'Current payment method').toLowerCase();
        if (current === 'cash') paymentMethod = 'cash';
        else if (current === 'card' || current === 'credit_card')
          paymentMethod = 'credit_card';
        else
          fail(
            'The current payment method cannot be represented by the delivery edit API. Provide an explicit supported paymentMethod after reconciling the order; no edit was submitted.'
          );
      }
      fields = {
        orderNo: before.orderNumber,
        customerName: customer.name,
        customerAddress: customer.address,
        customerEmail: customer.emailAddress,
        customerPhoneNumber: customer.phoneNumber,
        restaurantName: restaurant.name,
        restaurantAddress: restaurant.address,
        restaurantPhoneNumber: restaurant.phoneNumber,
        pickupLatitude: restaurant.latitude ?? undefined,
        pickupLongitude: restaurant.longitude ?? undefined,
        deliveryLatitude: customer.latitude ?? undefined,
        deliveryLongitude: customer.longitude ?? undefined,
        expectedDeliveryDate: activity.expectedDeliveryDate,
        expectedPickupTime: activity.expectedPickupTime,
        expectedDeliveryTime: activity.expectedDeliveryTime,
        tip: costing.tip,
        tax: costing.tax,
        discountAmount: costing.discountAmount,
        deliveryFee: costing.deliveryFee,
        totalCost:
          typeof costing.totalCost === 'number'
            ? String(costing.totalCost)
            : costing.totalCost,
        deliveryInstruction: before.deliveryInstruction,
        paymentMethod,
        orderItems: before.orderItems
      };
      for (const key of editKeys)
        if (input[key] !== undefined)
          fields[key === 'orderNumber' ? 'orderNo' : key] = input[key];
      if (input.orderItems !== undefined) fields.orderItems = items(input.orderItems);
      for (const key of [
        'orderNo',
        'customerName',
        'customerAddress',
        'customerPhoneNumber',
        'restaurantName',
        'restaurantAddress'
      ])
        text(fields[key], key);
      if (typeof fields.customerEmail !== 'string')
        fail(
          'The documented edit requires customerEmail; provide it when absent from the current detail record.'
        );
      // Existing detail times may be hh:mm; preserve those provider values unless explicitly changed.
      validateFields(input);
    }
    try {
      if (fields) {
        await client.editDeliveryOrder(input.orderId, fields);
        actions.push('Order details accepted');
        number = text(fields.orderNo, 'Updated order number');
        await client.exactOrder(input.orderId, number);
      }
      if (input.status !== undefined) {
        await client.updateOrderStatus(input.orderId, input.status);
        actions.push(`Status request accepted: ${input.status}`);
        const after = await client.exactOrder(input.orderId, number);
        if ((child(after.orderStatus).orderState ?? after.status) !== input.status)
          fail('The requested status was not observed. Read current state before continuing.');
      }
      if (input.readyToPickup !== undefined) {
        await client.markOrderReadyToPickup(input.orderId, input.readyToPickup);
        actions.push('Ready-to-pickup request accepted');
        pendingActions.push('Ready-to-pickup completion has no documented exact readback');
      }
      if (input.unassignCarrier || input.carrierId !== undefined) {
        if (input.unassignCarrier) await client.unassignOrderFromCarrier(input.orderId);
        else
          await client.assignOrderToCarrier(input.orderId, id(input.carrierId, 'Carrier ID'));
        actions.push(
          input.unassignCarrier
            ? 'Carrier removal request accepted'
            : 'Carrier assignment request accepted'
        );
        const assigned = child(
          (await client.exactOrder(input.orderId, number)).assignedCarrier
        ).id;
        if (input.unassignCarrier ? assigned != null : assigned !== input.carrierId)
          fail(
            'Requested carrier state was not observed. Read current state before continuing.'
          );
      }
    } catch {
      client.partial(input.orderId, actions);
    }
    return {
      output: { success: true, actions, pendingActions, orderId: input.orderId },
      message: `Shipday confirmed or accepted ${actions.length} update request(s) for order ${input.orderId}.${pendingActions.length ? ' Ready-to-pickup completion remains unverified.' : ''}`
    };
  })
  .build();
