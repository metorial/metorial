import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z
  .object({
    orderId: z.number().optional().describe('Unique order identifier'),
    orderNumber: z.string().optional().describe('Order reference number'),
    companyId: z.number().optional().describe('Associated company ID'),
    customer: z
      .object({
        name: z.string().optional(),
        address: z.string().optional(),
        phoneNumber: z.string().optional(),
        emailAddress: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional()
      })
      .optional()
      .describe('Customer details'),
    restaurant: z
      .object({
        id: z.number().optional(),
        name: z.string().optional(),
        address: z.string().optional(),
        phoneNumber: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional()
      })
      .optional()
      .describe('Restaurant/pickup location details'),
    assignedCarrier: z
      .object({
        id: z.number().optional(),
        name: z.string().optional(),
        phoneNumber: z.string().optional(),
        email: z.string().optional(),
        isOnShift: z.boolean().optional()
      })
      .optional()
      .describe('Assigned driver details'),
    distance: z.number().optional().describe('Delivery distance'),
    costing: z
      .object({
        totalCost: z.number().optional(),
        deliveryFee: z.number().optional(),
        tip: z.number().optional(),
        discountAmount: z.number().optional(),
        tax: z.number().optional()
      })
      .optional()
      .describe('Financial breakdown'),
    orderStatus: z
      .object({
        orderState: z.string().optional(),
        accepted: z.boolean().optional(),
        imcpilete: z.boolean().optional()
      })
      .optional()
      .describe('Current order status'),
    paymentMethod: z.string().optional().describe('Payment method'),
    deliveryInstruction: z.string().optional().describe('Delivery instructions'),
    trackingLink: z.string().optional().describe('Public tracking link'),
    orderItems: z
      .array(
        z.object({
          name: z.string().optional(),
          quantity: z.number().optional(),
          unitPrice: z.number().optional()
        })
      )
      .optional()
      .describe('Order line items'),
    activityLog: z.record(z.string(), z.unknown()).optional().describe('Activity timestamps')
  })
  .passthrough();

export let getDeliveryOrders = SlateTool.create(spec, {
  name: 'Get Delivery Orders',
  key: 'get_delivery_orders',
  description: `Retrieves delivery orders from Shipday. Can fetch all active orders, get details for a specific order by order number, or query orders by time range and status with pagination.`,
  instructions: [
    'To get all active orders, omit all optional filters.',
    'To get a specific order, provide the orderNumber.',
    'To query by time range/status, provide startTime and/or endTime with optional orderStatus.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      orderNumber: z.string().optional().describe('Specific order number to look up'),
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

    let orders: unknown[];

    if (ctx.input.orderNumber) {
      let result = await client.getOrderDetails(ctx.input.orderNumber);
      orders = Array.isArray(result) ? result : [result];
    } else if (ctx.input.startTime || ctx.input.endTime || ctx.input.orderStatus) {
      let queryParams: Record<string, unknown> = {};
      if (ctx.input.startTime) queryParams.startTime = ctx.input.startTime;
      if (ctx.input.endTime) queryParams.endTime = ctx.input.endTime;
      if (ctx.input.orderStatus) queryParams.orderStatus = ctx.input.orderStatus;
      if (ctx.input.startCursor) queryParams.startCursor = ctx.input.startCursor;
      if (ctx.input.endCursor) queryParams.endCursor = ctx.input.endCursor;
      orders = await client.queryOrders(queryParams);
      orders = Array.isArray(orders) ? orders : [];
    } else {
      orders = await client.getActiveOrders();
      orders = Array.isArray(orders) ? orders : [];
    }

    return {
      output: {
        orders: orders as z.infer<typeof orderSchema>[],
        count: orders.length
      },
      message: `Retrieved **${orders.length}** delivery order(s).`
    };
  })
  .build();
