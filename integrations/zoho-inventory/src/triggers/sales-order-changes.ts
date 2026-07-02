import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let salesOrderChanges = SlateTrigger.create(spec, {
  name: 'Sales Order Changes',
  key: 'sales_order_changes',
  description:
    'Triggers when sales orders are created or updated in Zoho Inventory. Polls for recently modified sales orders.'
})
  .input(
    z.object({
      salesOrderId: z.string().describe('Sales order ID'),
      salesorderNumber: z.string().optional().describe('Sales order number'),
      customerName: z.string().optional().describe('Customer name'),
      status: z.string().optional().describe('Order status'),
      total: z.number().optional().describe('Total amount'),
      date: z.string().optional().describe('Order date'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .output(
    z.object({
      salesOrderId: z.string().describe('Sales order ID'),
      salesorderNumber: z.string().optional().describe('Sales order number'),
      customerName: z.string().optional().describe('Customer name'),
      status: z.string().optional().describe('Order status'),
      total: z.number().optional().describe('Total amount'),
      date: z.string().optional().describe('Order date'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let result = await client.listSalesOrders({
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 25
      });

      let orders = result.salesorders || [];
      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let newOrders: any[] = [];

      for (let order of orders) {
        if (
          lastPolledAt &&
          order.last_modified_time &&
          order.last_modified_time <= lastPolledAt
        ) {
          break;
        }
        newOrders.push(order);
      }

      let updatedLastPolled =
        orders.length > 0 && orders[0].last_modified_time
          ? orders[0].last_modified_time
          : lastPolledAt;

      return {
        inputs: newOrders.map((so: any) => ({
          salesOrderId: String(so.salesorder_id),
          salesorderNumber: so.salesorder_number ?? undefined,
          customerName: so.customer_name ?? undefined,
          status: so.status ?? undefined,
          total: so.total ?? undefined,
          date: so.date ?? undefined,
          lastModifiedTime: so.last_modified_time ?? undefined
        })),
        updatedState: {
          lastPolledAt: updatedLastPolled
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'sales_order.updated',
        id: `so-${ctx.input.salesOrderId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          salesOrderId: ctx.input.salesOrderId,
          salesorderNumber: ctx.input.salesorderNumber,
          customerName: ctx.input.customerName,
          status: ctx.input.status,
          total: ctx.input.total,
          date: ctx.input.date,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
