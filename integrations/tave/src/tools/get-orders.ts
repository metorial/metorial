import { SlateTool } from 'slates';
import { z } from 'zod';
import { numberField, TavePublicClient, textField } from '../lib/client';
import { spec } from '../spec';

let orderSchema = z.object({
  orderId: z.string().describe('ID of the order'),
  jobId: z.string().optional().describe('ID of the job associated with the order'),
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
      brand: z
        .string()
        .optional()
        .describe('Filter orders by exact brand name or ID from get_brands'),
      jobType: z
        .string()
        .optional()
        .describe('Filter orders by exact job type name or ID from get_job_types'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .describe(
          'Results per page: 10–100 for an unfiltered list, or 1–100 for filtered results'
        )
    })
  )
  .output(
    z.object({
      orders: z.array(orderSchema).describe('List of orders'),
      totalCount: z.number().optional().describe('Total number of orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth);

    ctx.info('Fetching orders from Tave');

    let result = await client.listOrders({
      brand: ctx.input.brand,
      jobType: ctx.input.jobType,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let orders = result.items.map(o => ({
      orderId: String(o.id ?? ''),
      jobId: textField(o, 'jobId'),
      jobType: textField(o, 'jobTypeName', 'job_type'),
      brand: textField(o, 'brandName', 'brand'),
      amount: numberField(o, 'amount', 'total'),
      status: textField(o, 'status'),
      createdAt: textField(o, 'created', 'created_at'),
      raw: o
    }));

    let totalCount = result.meta.totalItems;

    return {
      output: {
        orders,
        totalCount
      },
      message: `Retrieved **${orders.length}** order(s)${ctx.input.brand ? ` for brand "${ctx.input.brand}"` : ''}${ctx.input.jobType ? ` of type "${ctx.input.jobType}"` : ''}.`
    };
  })
  .build();
