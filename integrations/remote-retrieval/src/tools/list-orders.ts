import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, mapOrderDetails } from '../lib/client';
import { spec } from '../spec';

let orderShipmentSchema = z.object({
  deviceType: z.string().describe('Type of device being returned'),
  sendStatus: z.string().describe('Status of the box shipped to employee'),
  returnStatus: z.string().describe('Status of the device shipped back to company')
});

let orderEmployeeSchema = z.object({
  email: z.string().describe('Employee email'),
  name: z.string().describe('Employee name'),
  addressLine1: z.string().describe('Employee street address'),
  addressLine2: z.string().optional().describe('Employee address line 2'),
  city: z.string().describe('Employee city'),
  state: z.string().describe('Employee state'),
  zip: z.string().describe('Employee ZIP code')
});

let orderCompanySchema = z.object({
  email: z.string().describe('Company contact email'),
  name: z.string().describe('Return contact name'),
  addressLine1: z.string().describe('Company street address'),
  addressLine2: z.string().optional().describe('Company address line 2'),
  city: z.string().describe('Company city'),
  state: z.string().describe('Company state'),
  zip: z.string().describe('Company ZIP code')
});

let orderResultSchema = z.object({
  orderId: z.number().describe('Unique order identifier'),
  paymentStatus: z.string().describe('Payment status (Completed or Pending)'),
  orderStatus: z.string().describe('Current order/shipping status'),
  employeeInfo: orderEmployeeSchema,
  companyInfo: orderCompanySchema,
  shipments: orderShipmentSchema
});

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Retrieve equipment return orders with pagination support. Returns order details including payment status, shipping status, employee and company information, and shipment tracking.
Supports cursor-based pagination (25 orders per page).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor or next/previous URL returned by list_orders')
    })
  )
  .output(
    z.object({
      orders: z.array(orderResultSchema).describe('List of return orders'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page, null if no more pages'),
      previousCursor: z
        .string()
        .nullable()
        .describe('Cursor for the previous page, null if at the first page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getOrders(ctx.input.cursor);

    let orders = result.results.map(order => ({
      ...mapOrderDetails(order),
      paymentStatus: order.payment_status,
      orderStatus: order.order_status
    }));

    return {
      output: {
        orders,
        nextCursor: result.next,
        previousCursor: result.previous
      },
      message: `Retrieved **${orders.length}** order(s).${result.next ? ' More pages available.' : ''}`
    };
  })
  .build();
