import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z.object({
  orderId: z.string().describe('Internal unique order ID'),
  orderName: z.string().optional().describe('Buyer-facing order name/reference'),
  firstName: z.string().optional().describe('Buyer first name'),
  lastName: z.string().optional().describe('Buyer last name'),
  email: z.string().optional().describe('Buyer email address'),
  mobile: z.string().optional().describe('Buyer mobile number'),
  location: z.any().optional().describe('Buyer location details'),
  status: z.string().optional().describe('Order status'),
  financialStatus: z.string().optional().describe('Financial status of the order'),
  paymentType: z.string().optional().describe('Payment method used'),
  paymentGateway: z.string().optional().describe('Payment gateway used'),
  purchaseTotals: z.any().optional().describe('Purchase totals breakdown'),
  totals: z.any().optional().describe('Itemized totals including fees and taxes'),
  eventId: z.string().optional().describe('ID of the associated event'),
  eventDateId: z.string().optional().describe('ID of the specific event date'),
  manualOrder: z.boolean().optional().describe('Whether this was a manually created order'),
  createdAt: z.string().optional().describe('When the order was created'),
  completedAt: z.string().optional().describe('When the order was completed'),
  updatedAt: z.string().optional().describe('When the order was last updated')
});

export let listOrders = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `List all orders for a specific Humanitix event. Returns buyer information, payment details, order status, and totals. Orders are queried per event using the event ID.`,
  instructions: [
    'The internal order ID is different from the buyer-facing "Order ID" visible in reports. Use the internal ID from the URL.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID to retrieve orders for'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of orders per page (max 100)')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of orders'),
      totalResults: z.number().optional().describe('Total number of orders available'),
      page: z.number().optional().describe('Current page number'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getOrders(ctx.input.eventId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let orders = (response.orders || []).map((order: any) => ({
      orderId: order._id,
      orderName: order.orderName,
      firstName: order.firstName,
      lastName: order.lastName,
      email: order.email,
      mobile: order.mobile,
      location: order.location,
      status: order.status,
      financialStatus: order.financialStatus,
      paymentType: order.paymentType,
      paymentGateway: order.paymentGateway,
      purchaseTotals: order.purchaseTotals,
      totals: order.totals,
      eventId: order.eventId,
      eventDateId: order.eventDateId,
      manualOrder: order.manualOrder,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      updatedAt: order.updatedAt
    }));

    return {
      output: {
        orders,
        totalResults: response.totalResults,
        page: response.page,
        pageSize: response.pageSize
      },
      message: `Found **${orders.length}** orders${response.totalResults ? ` out of ${response.totalResults} total` : ''} for event \`${ctx.input.eventId}\`.`
    };
  })
  .build();
