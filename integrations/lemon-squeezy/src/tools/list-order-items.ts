import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrderItemsTool = SlateTool.create(spec, {
  name: 'List Order Items',
  key: 'list_order_items',
  description:
    'Retrieve order line items from Lemon Squeezy, including product, variant, price, and quantity details. Filter by order, product, or variant.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().optional().describe('Filter order items by order ID'),
      productId: z.string().optional().describe('Filter order items by product ID'),
      variantId: z.string().optional().describe('Filter order items by variant ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      orderItems: z.array(
        z.object({
          orderItemId: z.string(),
          orderId: z.number(),
          productId: z.number(),
          variantId: z.number(),
          productName: z.string(),
          variantName: z.string(),
          price: z.number(),
          quantity: z.number(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listOrderItems({
      orderId: ctx.input.orderId,
      productId: ctx.input.productId,
      variantId: ctx.input.variantId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let orderItems = (response.data || []).map((item: any) => ({
      orderItemId: item.id,
      orderId: item.attributes.order_id,
      productId: item.attributes.product_id,
      variantId: item.attributes.variant_id,
      productName: item.attributes.product_name,
      variantName: item.attributes.variant_name,
      price: item.attributes.price,
      quantity: item.attributes.quantity,
      createdAt: item.attributes.created_at,
      updatedAt: item.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { orderItems, hasMore },
      message: `Found **${orderItems.length}** order item(s).`
    };
  })
  .build();
