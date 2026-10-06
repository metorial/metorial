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
    .describe('Add-ons or modifications')
});

let pickupOrderInputSchema = z.object({
  action: z
    .enum(['create', 'get', 'edit', 'delete'])
    .describe('Action to perform on the pickup order'),

  // For get and delete
  orderNumber: z
    .string()
    .optional()
    .describe('Order number for retrieving or identifying the order'),
  orderId: z
    .number()
    .optional()
    .describe(
      'Native pickup order ID (documented get, edit and delete); distinct from orderNumber'
    ),

  // For create and edit
  customerName: z.string().optional().describe('Customer full name'),
  customerPhone: z.string().optional().describe('Customer phone number'),
  customerEmail: z.string().optional().describe('Customer email address'),
  restaurantName: z.string().optional().describe('Pickup location/restaurant name'),
  restaurantAddress: z.string().optional().describe('Pickup location address'),
  restaurantPhoneNumber: z.string().optional().describe('Restaurant phone number'),
  orderItems: z.array(orderItemSchema).optional().describe('List of order items'),
  tips: z.number().optional().describe('Tip amount'),
  tax: z.number().optional().describe('Tax amount'),
  discountAmount: z.number().optional().describe('Discount amount'),
  totalOrderCost: z.number().optional().describe('Total order cost'),
  paymentMethod: z.enum(['CARD', 'CASH', 'ONLINE']).optional().describe('Payment method'),
  pickupInstruction: z.string().optional().describe('Special pickup instructions'),
  expectedPickupDate: z.string().optional().describe('Expected pickup date (yyyy-mm-dd)'),
  expectedPickupTime: z.string().optional().describe('Expected pickup time (hh:mm:ss)'),
  orderSource: z.string().optional().describe('Origin platform of the order')
});

export let managePickupOrder = SlateTool.create(spec, {
  name: 'Manage Pickup Order',
  key: 'manage_pickup_order',
  description: `Create, retrieve, edit, or delete pickup-only orders in Shipday. Pickup orders are distinct from delivery orders and don't require delivery addresses.`,
  instructions: [
    'Set action to "create" and provide order details to create a new pickup order.',
    'Set action to "get" and provide orderNumber to retrieve a pickup order.',
    'Set action to "edit" and provide orderId with updated fields to edit.',
    'Set action to "delete" and provide orderId to delete a pickup order.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(pickupOrderInputSchema)
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      orderId: z.number().optional().describe('Pickup order ID (for create)'),
      order: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Pickup order details (for get)'),
      responseMessage: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input,
      client = new ShipdayClient({ token: ctx.auth.token });
    if (input.action === 'get' || input.action === 'delete') {
      const allowed = new Set([
        'action',
        'orderId',
        ...(input.action === 'get' ? ['orderNumber'] : [])
      ]);
      if (
        Object.entries(input).some(([key, value]) => value !== undefined && !allowed.has(key))
      )
        fail(
          'Pickup read/deletion accepts only its exact identifier. Remove unrelated edit fields.'
        );
    }
    validateFields(input);
    if (input.orderItems !== undefined) items(input.orderItems);
    if (input.action === 'get') {
      if (input.orderId !== undefined && input.orderNumber !== undefined)
        fail('Use orderId or the legacy orderNumber lookup, not both.');
      const order =
        input.orderId !== undefined
          ? await client.getPickupById(input.orderId)
          : await client.getPickupOrderDetails(text(input.orderNumber, 'Order number'));
      return {
        output: { success: true, order, orderId: id(order.orderId) },
        message: `Retrieved exact pickup order ${order.orderId}.`
      };
    }
    if (input.action === 'delete') {
      if (input.orderNumber !== undefined)
        fail('Pickup deletion uses orderId; do not supply an unrelated orderNumber.');
      const orderId = id(input.orderId, 'Pickup order ID');
      await client.deletePickupOrder(orderId);
      return {
        output: {
          success: true,
          orderId,
          responseMessage: 'Deletion accepted and native absence confirmed'
        },
        message: `Pickup order ${orderId} is no longer readable.`
      };
    }
    const optionalKeys = [
      'tips',
      'tax',
      'discountAmount',
      'totalOrderCost',
      'paymentMethod',
      'pickupInstruction',
      'expectedPickupDate',
      'expectedPickupTime',
      'orderSource'
    ] as const;
    let body: Row;
    if (input.action === 'create') {
      if (input.orderId !== undefined)
        fail('orderId cannot be supplied when creating a pickup order.');
      body = {
        orderNumber: text(input.orderNumber, 'Order number'),
        customer: {
          name: text(input.customerName, 'Customer name'),
          phone: text(input.customerPhone, 'Customer phone'),
          email: input.customerEmail
        },
        restaurant: {
          name: text(input.restaurantName, 'Restaurant name'),
          address: text(input.restaurantAddress, 'Restaurant address'),
          phone: input.restaurantPhoneNumber
        }
      };
    } else {
      const orderId = id(input.orderId, 'Pickup order ID');
      if (
        ![
          'orderNumber',
          'customerName',
          'customerPhone',
          'customerEmail',
          'restaurantName',
          'restaurantAddress',
          'restaurantPhoneNumber',
          'orderItems',
          ...optionalKeys
        ].some(key => input[key as keyof typeof input] !== undefined)
      )
        fail('Provide at least one pickup edit field.');
      const before = await client.getPickupById(orderId);
      body = {};
      for (const key of [
        'orderNumber',
        'customer',
        'restaurant',
        'orderItem',
        'companyId',
        'status',
        ...optionalKeys
      ])
        if (before[key] !== undefined) body[key] = before[key];
      body.customer = { ...child(before.customer) };
      body.restaurant = { ...child(before.restaurant) };
      if (input.orderNumber !== undefined) body.orderNumber = input.orderNumber;
      const customer = child(body.customer),
        restaurant = child(body.restaurant);
      for (const [key, value] of [
        ['name', input.customerName],
        ['phone', input.customerPhone],
        ['email', input.customerEmail]
      ] as const)
        if (value !== undefined) customer[key] = value;
      for (const [key, value] of [
        ['name', input.restaurantName],
        ['address', input.restaurantAddress],
        ['phone', input.restaurantPhoneNumber]
      ] as const)
        if (value !== undefined) restaurant[key] = value;
      body.customer = customer;
      body.restaurant = restaurant;
    }
    for (const key of optionalKeys) if (input[key] !== undefined) body[key] = input[key];
    if (input.orderItems !== undefined) body.orderItem = items(input.orderItems);
    const result =
      input.action === 'create'
        ? await client.createPickupOrder(body)
        : await client.editPickupOrder(id(input.orderId), body);
    const orderId = id(result.orderId, 'Pickup receipt ID');
    // Native receipt identifies the mutation; readback keeps an unknown outcome visible.
    let actual: Row;
    try {
      actual = await client.getPickupById(orderId);
    } catch {
      return client.partial(orderId, [
        input.action === 'create' ? 'Pickup creation accepted' : 'Pickup edit accepted'
      ]);
    }
    if (actual.orderNumber !== body.orderNumber)
      return client.partial(orderId, ['Pickup request accepted; reference readback differed']);
    return {
      output: {
        success: true,
        orderId,
        responseMessage: text(result.message, 'Pickup response')
      },
      message: `Shipday confirmed pickup ${input.action} (ID: ${orderId}).`
    };
  })
  .build();
