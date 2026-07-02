import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

let orderItemSchema = z.object({
  name: z.string().describe('Name of the item'),
  quantity: z.number().describe('Quantity of the item'),
  unitPrice: z.number().optional().describe('Unit price of the item'),
  addOns: z.string().optional().describe('Add-ons or modifications for the item'),
  detail: z.string().optional().describe('Additional details about the item')
});

let addressBreakdownSchema = z
  .object({
    unit: z.string().optional().describe('Unit or apartment number'),
    street: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State or province'),
    zip: z.string().optional().describe('Postal/ZIP code'),
    country: z.string().optional().describe('Country')
  })
  .optional();

export let createDeliveryOrder = SlateTool.create(spec, {
  name: 'Create Delivery Order',
  key: 'create_delivery_order',
  description: `Creates a new delivery order in Shipday. Specify the customer and restaurant/pickup details along with optional order items, pricing, delivery instructions, and expected timing.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orderNumber: z.string().describe('Unique alphanumeric identifier for the order'),
      customerName: z.string().describe('Full name of the customer'),
      customerAddress: z.string().describe('Delivery address of the customer'),
      customerPhoneNumber: z.string().describe('Customer phone number with country code'),
      customerEmail: z.string().optional().describe('Customer email address'),
      restaurantName: z.string().describe('Name of the pickup location/restaurant'),
      restaurantAddress: z.string().describe('Address of the pickup location/restaurant'),
      restaurantPhoneNumber: z
        .string()
        .optional()
        .describe('Restaurant phone number with country code'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .describe('Expected delivery date (yyyy-mm-dd)'),
      expectedPickupTime: z.string().optional().describe('Expected pickup time (hh:mm:ss)'),
      expectedDeliveryTime: z
        .string()
        .optional()
        .describe('Expected delivery time (hh:mm:ss)'),
      pickupLatitude: z.number().optional().describe('Latitude of pickup location'),
      pickupLongitude: z.number().optional().describe('Longitude of pickup location'),
      deliveryLatitude: z.number().optional().describe('Latitude of delivery location'),
      deliveryLongitude: z.number().optional().describe('Longitude of delivery location'),
      orderItems: z.array(orderItemSchema).optional().describe('List of items in the order'),
      tips: z.number().optional().describe('Tips amount'),
      tax: z.number().optional().describe('Tax amount'),
      discountAmount: z.number().optional().describe('Discount amount'),
      deliveryFee: z.number().optional().describe('Delivery fee'),
      totalOrderCost: z.number().optional().describe('Total order cost'),
      paymentMethod: z.enum(['cash', 'credit_card']).optional().describe('Payment method'),
      deliveryInstruction: z
        .string()
        .optional()
        .describe('Special instructions for the driver'),
      orderSource: z.string().optional().describe('Origin platform of the order'),
      isCatering: z.boolean().optional().describe('Whether this is a catering order'),
      pickup: addressBreakdownSchema.describe('Detailed pickup address breakdown'),
      dropoff: addressBreakdownSchema.describe('Detailed dropoff address breakdown')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the order was created successfully'),
      orderId: z.number().describe('Unique identifier of the created order'),
      responseMessage: z.string().describe('Response message from Shipday')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShipdayClient({ token: ctx.auth.token });

    let body: Record<string, unknown> = {
      orderNumber: ctx.input.orderNumber,
      customerName: ctx.input.customerName,
      customerAddress: ctx.input.customerAddress,
      customerPhoneNumber: ctx.input.customerPhoneNumber
    };

    if (ctx.input.customerEmail) body.customerEmail = ctx.input.customerEmail;
    if (ctx.input.restaurantName) body.restaurantName = ctx.input.restaurantName;
    if (ctx.input.restaurantAddress) body.restaurantAddress = ctx.input.restaurantAddress;
    if (ctx.input.restaurantPhoneNumber)
      body.restaurantPhoneNumber = ctx.input.restaurantPhoneNumber;
    if (ctx.input.expectedDeliveryDate)
      body.expectedDeliveryDate = ctx.input.expectedDeliveryDate;
    if (ctx.input.expectedPickupTime) body.expectedPickupTime = ctx.input.expectedPickupTime;
    if (ctx.input.expectedDeliveryTime)
      body.expectedDeliveryTime = ctx.input.expectedDeliveryTime;
    if (ctx.input.pickupLatitude !== undefined) body.pickupLatitude = ctx.input.pickupLatitude;
    if (ctx.input.pickupLongitude !== undefined)
      body.pickupLongitude = ctx.input.pickupLongitude;
    if (ctx.input.deliveryLatitude !== undefined)
      body.deliveryLatitude = ctx.input.deliveryLatitude;
    if (ctx.input.deliveryLongitude !== undefined)
      body.deliveryLongitude = ctx.input.deliveryLongitude;
    if (ctx.input.orderItems) body.orderItem = ctx.input.orderItems;
    if (ctx.input.tips !== undefined) body.tips = ctx.input.tips;
    if (ctx.input.tax !== undefined) body.tax = ctx.input.tax;
    if (ctx.input.discountAmount !== undefined) body.discountAmount = ctx.input.discountAmount;
    if (ctx.input.deliveryFee !== undefined) body.deliveryFee = ctx.input.deliveryFee;
    if (ctx.input.totalOrderCost !== undefined) body.totalOrderCost = ctx.input.totalOrderCost;
    if (ctx.input.paymentMethod) body.paymentMethod = ctx.input.paymentMethod;
    if (ctx.input.deliveryInstruction)
      body.deliveryInstruction = ctx.input.deliveryInstruction;
    if (ctx.input.orderSource) body.orderSource = ctx.input.orderSource;
    if (ctx.input.isCatering !== undefined) body.isCatering = ctx.input.isCatering;
    if (ctx.input.pickup) body.pickup = ctx.input.pickup;
    if (ctx.input.dropoff) body.dropoff = ctx.input.dropoff;

    let result = await client.createDeliveryOrder(body);

    return {
      output: {
        success: result.success,
        orderId: result.orderId,
        responseMessage: result.response
      },
      message: `Created delivery order **#${ctx.input.orderNumber}** (ID: ${result.orderId}) for **${ctx.input.customerName}** at ${ctx.input.customerAddress}.`
    };
  })
  .build();
