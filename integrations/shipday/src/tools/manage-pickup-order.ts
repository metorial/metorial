import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

let orderItemSchema = z.object({
  name: z.string().describe('Name of the item'),
  quantity: z.number().describe('Quantity of the item'),
  unitPrice: z.number().optional().describe('Unit price of the item'),
  addOns: z.string().optional().describe('Add-ons or modifications')
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
  orderId: z.number().optional().describe('Shipday order ID (required for edit and delete)'),

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
    let client = new ShipdayClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let body: Record<string, unknown> = {};
      if (ctx.input.orderNumber) body.orderNumber = ctx.input.orderNumber;
      if (ctx.input.customerName) {
        body.customer = {
          name: ctx.input.customerName,
          phoneNumber: ctx.input.customerPhone,
          emailAddress: ctx.input.customerEmail
        };
      }
      if (ctx.input.restaurantName) {
        body.restaurant = {
          name: ctx.input.restaurantName,
          address: ctx.input.restaurantAddress,
          phoneNumber: ctx.input.restaurantPhoneNumber
        };
      }
      if (ctx.input.orderItems) body.orderItem = ctx.input.orderItems;
      if (ctx.input.tips !== undefined) body.tips = ctx.input.tips;
      if (ctx.input.tax !== undefined) body.tax = ctx.input.tax;
      if (ctx.input.discountAmount !== undefined)
        body.discountAmount = ctx.input.discountAmount;
      if (ctx.input.totalOrderCost !== undefined)
        body.totalOrderCost = ctx.input.totalOrderCost;
      if (ctx.input.paymentMethod) body.paymentMethod = ctx.input.paymentMethod;
      if (ctx.input.pickupInstruction) body.pickupInstruction = ctx.input.pickupInstruction;
      if (ctx.input.expectedPickupDate) body.expectedPickupDate = ctx.input.expectedPickupDate;
      if (ctx.input.expectedPickupTime) body.expectedPickupTime = ctx.input.expectedPickupTime;
      if (ctx.input.orderSource) body.orderSource = ctx.input.orderSource;

      let result = await client.createPickupOrder(body);
      return {
        output: {
          success: result.success,
          orderId: result.orderId,
          responseMessage: result.message
        },
        message: `Created pickup order **#${ctx.input.orderNumber}** (ID: ${result.orderId}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.orderNumber) {
        throw new Error('orderNumber is required to retrieve a pickup order');
      }
      let result = await client.getPickupOrderDetails(ctx.input.orderNumber);
      return {
        output: {
          success: true,
          order: result
        },
        message: `Retrieved pickup order **#${ctx.input.orderNumber}**.`
      };
    }

    if (ctx.input.action === 'edit') {
      if (!ctx.input.orderId) {
        throw new Error('orderId is required to edit a pickup order');
      }
      let body: Record<string, unknown> = {};
      if (ctx.input.orderNumber) body.orderNumber = ctx.input.orderNumber;
      if (ctx.input.customerName) body.customerName = ctx.input.customerName;
      if (ctx.input.customerPhone) body.customerPhone = ctx.input.customerPhone;
      if (ctx.input.customerEmail) body.customerEmail = ctx.input.customerEmail;
      if (ctx.input.restaurantName) body.restaurantName = ctx.input.restaurantName;
      if (ctx.input.restaurantAddress) body.restaurantAddress = ctx.input.restaurantAddress;
      if (ctx.input.orderItems) body.orderItem = ctx.input.orderItems;
      if (ctx.input.tips !== undefined) body.tips = ctx.input.tips;
      if (ctx.input.tax !== undefined) body.tax = ctx.input.tax;
      if (ctx.input.totalOrderCost !== undefined)
        body.totalOrderCost = ctx.input.totalOrderCost;
      if (ctx.input.pickupInstruction) body.pickupInstruction = ctx.input.pickupInstruction;
      if (ctx.input.expectedPickupDate) body.expectedPickupDate = ctx.input.expectedPickupDate;
      if (ctx.input.expectedPickupTime) body.expectedPickupTime = ctx.input.expectedPickupTime;

      await client.editPickupOrder(ctx.input.orderId, body);
      return {
        output: {
          success: true,
          responseMessage: 'Pickup order updated'
        },
        message: `Updated pickup order **${ctx.input.orderId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.orderId) {
        throw new Error('orderId is required to delete a pickup order');
      }
      await client.deletePickupOrder(ctx.input.orderId);
      return {
        output: {
          success: true,
          responseMessage: 'Pickup order deleted'
        },
        message: `Deleted pickup order **${ctx.input.orderId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
