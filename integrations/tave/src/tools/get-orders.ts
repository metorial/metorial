import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z.object({
  orderId: z.string().describe('ID of the order'),
  jobType: z.string().optional().describe('Type of job associated with the order'),
  brand: z.string().optional().describe('Brand associated with the order'),
  amount: z.number().optional().describe('Order amount'),
  status: z.string().optional().describe('Status of the order'),
  createdAt: z.string().optional().describe('When the order was created'),
  raw: z.any().optional().describe('Full order record')
});

export let getOrders = SlateTool.create(spec, {
  name: 'Get Orders',
  key: 'get_orders',
  description: `Retrieves orders from Tave, including both manually created orders and electronic bookings. Can filter by brand and job type. Requires the **API Key (Public API V2)** authentication method.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      brand: z.string().optional().describe('Filter orders by brand name'),
      jobType: z.string().optional().describe('Filter orders by job type'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of orders'),
      totalCount: z.number().optional().describe('Total number of orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth.token);

    ctx.info('Fetching orders from Tave');

    let result = await client.listOrders({
      brand: ctx.input.brand,
      jobType: ctx.input.jobType,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let items = Array.isArray(result) ? result : (result?.data ?? result?.orders ?? []);

    let orders = items.map((o: any) => ({
      orderId: String(o.id ?? o.order_id ?? ''),
      jobType: o.job_type ?? undefined,
      brand: o.brand ?? undefined,
      amount: o.amount ?? o.total ?? undefined,
      status: o.status ?? undefined,
      createdAt: o.created_at ?? o.created ?? undefined,
      raw: o
    }));

    let totalCount = result?.total ?? result?.meta?.total ?? orders.length;

    return {
      output: {
        orders,
        totalCount
      },
      message: `Retrieved **${orders.length}** order(s)${ctx.input.brand ? ` for brand "${ctx.input.brand}"` : ''}${ctx.input.jobType ? ` of type "${ctx.input.jobType}"` : ''}.`
    };
  })
  .build();
