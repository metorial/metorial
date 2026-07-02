import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchOrders = SlateTool.create(spec, {
  name: 'Search Orders',
  key: 'search_orders',
  description: `Search and list orders in sevDesk. Filter by status, contact, date range, or order number. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .string()
        .optional()
        .describe('Filter by status: 100=Draft, 200=Confirmed, 500=Delivered, 1000=Invoiced'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      orderNumber: z.string().optional().describe('Filter by order number'),
      startDate: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Filter until date (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Max results (default: 100, max: 1000)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      orders: z.array(
        z.object({
          orderId: z.string(),
          orderNumber: z.string().optional(),
          contactId: z.string().optional(),
          contactName: z.string().optional(),
          orderDate: z.string().optional(),
          status: z.string().optional(),
          totalNet: z.string().optional(),
          totalGross: z.string().optional(),
          currency: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let params: Record<string, any> = {
      limit: ctx.input.limit ?? 100,
      offset: ctx.input.offset,
      embed: 'contact'
    };
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.contactId) {
      params['contact[id]'] = ctx.input.contactId;
      params['contact[objectName]'] = 'Contact';
    }
    if (ctx.input.orderNumber) params.orderNumber = ctx.input.orderNumber;
    if (ctx.input.startDate) params.startDate = ctx.input.startDate;
    if (ctx.input.endDate) params.endDate = ctx.input.endDate;

    let results = await client.listOrders(params);

    let orders = (results ?? []).map((o: any) => ({
      orderId: String(o.id),
      orderNumber: o.orderNumber ?? undefined,
      contactId: o.contact?.id ? String(o.contact.id) : undefined,
      contactName: o.contact?.name || undefined,
      orderDate: o.orderDate ?? undefined,
      status: o.status != null ? String(o.status) : undefined,
      totalNet: o.sumNet ?? undefined,
      totalGross: o.sumGross ?? undefined,
      currency: o.currency ?? undefined,
      createdAt: o.create ?? undefined
    }));

    return {
      output: {
        orders,
        totalCount: orders.length
      },
      message: `Found **${orders.length}** order(s).`
    };
  })
  .build();
