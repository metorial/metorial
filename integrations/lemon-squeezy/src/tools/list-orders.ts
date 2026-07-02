import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrdersTool = SlateTool.create(spec, {
  name: 'List Orders',
  key: 'list_orders',
  description: `Retrieve orders from your Lemon Squeezy store. Supports filtering by store ID or customer email and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter by store ID'),
      userEmail: z.string().optional().describe('Filter by customer email address'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      orders: z.array(
        z.object({
          orderId: z.string(),
          storeId: z.number(),
          customerId: z.number(),
          orderNumber: z.number(),
          userName: z.string(),
          userEmail: z.string(),
          currency: z.string(),
          total: z.number(),
          totalFormatted: z.string(),
          status: z.string(),
          statusFormatted: z.string(),
          refunded: z.boolean(),
          createdAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listOrders({
      storeId: ctx.input.storeId,
      userEmail: ctx.input.userEmail,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let orders = (response.data || []).map((order: any) => ({
      orderId: order.id,
      storeId: order.attributes.store_id,
      customerId: order.attributes.customer_id,
      orderNumber: order.attributes.order_number,
      userName: order.attributes.user_name,
      userEmail: order.attributes.user_email,
      currency: order.attributes.currency,
      total: order.attributes.total,
      totalFormatted: order.attributes.total_formatted,
      status: order.attributes.status,
      statusFormatted: order.attributes.status_formatted,
      refunded: order.attributes.refunded,
      createdAt: order.attributes.created_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { orders, hasMore },
      message: `Found **${orders.length}** order(s).`
    };
  })
  .build();
