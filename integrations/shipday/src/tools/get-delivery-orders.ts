import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { fail, parse, type Row } from '../lib/validation';
import { spec } from '../spec';

let orderSchema = z
  .object({
    orderId: z.number().nullish().describe('Unique order identifier'),
    orderNumber: z.string().nullish().describe('Order reference number'),
    companyId: z.number().nullish().describe('Associated company ID'),
    customer: z
      .object({
        name: z.string().nullish(),
        address: z.string().nullish(),
        phoneNumber: z.string().nullish(),
        emailAddress: z.string().nullish(),
        latitude: z.number().nullish(),
        longitude: z.number().nullish()
      })
      .nullish()
      .describe('Customer details'),
    restaurant: z
      .object({
        id: z.number().nullish(),
        name: z.string().nullish(),
        address: z.string().nullish(),
        phoneNumber: z.string().nullish(),
        latitude: z.number().nullish(),
        longitude: z.number().nullish()
      })
      .nullish()
      .describe('Restaurant/pickup location details'),
    assignedCarrier: z
      .object({
        id: z.number().nullish(),
        name: z.string().nullish(),
        phoneNumber: z.string().nullish(),
        email: z.string().nullish(),
        isOnShift: z.boolean().nullish()
      })
      .nullish()
      .describe('Assigned driver details'),
    distance: z.number().nullish().describe('Delivery distance'),
    costing: z
      .object({
        totalCost: z.number().nullish(),
        deliveryFee: z.number().nullish(),
        tip: z.number().nullish(),
        discountAmount: z.number().nullish(),
        tax: z.number().nullish()
      })
      .nullish()
      .describe('Financial breakdown'),
    orderStatus: z
      .object({
        orderState: z.string().nullish(),
        accepted: z.boolean().nullish(),
        imcpilete: z.boolean().nullish(),
        incomplete: z.boolean().nullish()
      })
      .nullish()
      .describe('Current order status'),
    paymentMethod: z.string().nullish().describe('Payment method'),
    deliveryInstruction: z.string().nullish().describe('Delivery instructions'),
    trackingLink: z.string().nullish().describe('Public tracking link'),
    orderItems: z
      .array(
        z.object({
          name: z.string().nullish(),
          quantity: z.number().nullish(),
          unitPrice: z.number().nullish()
        })
      )
      .nullish()
      .describe('Order line items'),
    activityLog: z.record(z.string(), z.unknown()).nullish().describe('Activity timestamps')
  })
  .passthrough();

export let getDeliveryOrders = SlateTool.create(spec, {
  name: 'Get Delivery Orders',
  key: 'get_delivery_orders',
  description: `Retrieves delivery orders from Shipday. Can fetch all active orders, get details for a specific order by order number, or query orders by time range and status with pagination.`,
  instructions: [
    'To get all active orders, omit all optional filters.',
    'To get a specific order, provide the orderNumber.',
    'Any supplied filter or cursor selects the query endpoint. Its default status is ALREADY_DELIVERED; supply explicit UTC times/status for a current window. Cursors are inclusive one-based row positions, not opaque tokens.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      orderNumber: z.string().optional().describe('Specific order number to look up'),
      orderId: z
        .number()
        .optional()
        .describe('Exact native order ID; use orderNumber too for inactive records'),
      startTime: z
        .string()
        .optional()
        .describe('Start time for query (ISO 8601 format, e.g. 2024-01-01T00:00:00Z)'),
      endTime: z.string().optional().describe('End time for query (ISO 8601 format)'),
      orderStatus: z
        .enum([
          'ACTIVE',
          'NOT_ASSIGNED',
          'NOT_ACCEPTED',
          'NOT_STARTED_YET',
          'STARTED',
          'PICKED_UP',
          'READY_TO_DELIVER',
          'ALREADY_DELIVERED',
          'FAILED_DELIVERY',
          'INCOMPLETE'
        ])
        .optional()
        .describe('Filter by order status'),
      startCursor: z.number().optional().describe('Pagination start cursor (default: 1)'),
      endCursor: z.number().optional().describe('Pagination end cursor (default: 100)')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of orders matching the criteria'),
      count: z.number().describe('Number of orders returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShipdayClient({ token: ctx.auth.token });

    const queryKeys = [
      'startTime',
      'endTime',
      'orderStatus',
      'startCursor',
      'endCursor'
    ] as const;
    const querying = queryKeys.some(key => ctx.input[key] !== undefined);
    if ((ctx.input.orderNumber !== undefined || ctx.input.orderId !== undefined) && querying)
      fail('Exact order lookup cannot be combined with query filters or cursors.');
    let orders: Row[];
    if (ctx.input.orderId !== undefined)
      orders = [await client.exactOrder(ctx.input.orderId, ctx.input.orderNumber)];
    else if (ctx.input.orderNumber !== undefined)
      orders = await client.getOrderDetails(ctx.input.orderNumber);
    else if (querying)
      orders = await client.queryOrders({
        startTime: ctx.input.startTime,
        endTime: ctx.input.endTime,
        orderStatus: ctx.input.orderStatus,
        startCursor: ctx.input.startCursor,
        endCursor: ctx.input.endCursor
      });
    else orders = await client.getActiveOrders();

    return {
      output: {
        orders: orders.map(order => parse(orderSchema, order)),
        count: orders.length
      },
      message: `Retrieved **${orders.length}** delivery order(s).`
    };
  })
  .build();
