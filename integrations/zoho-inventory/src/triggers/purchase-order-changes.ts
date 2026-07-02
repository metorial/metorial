import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let purchaseOrderChanges = SlateTrigger.create(spec, {
  name: 'Purchase Order Changes',
  key: 'purchase_order_changes',
  description:
    'Triggers when purchase orders are created or updated in Zoho Inventory. Polls for recently modified purchase orders.'
})
  .input(
    z.object({
      purchaseOrderId: z.string().describe('Purchase order ID'),
      purchaseorderNumber: z.string().optional().describe('PO number'),
      vendorName: z.string().optional().describe('Vendor name'),
      status: z.string().optional().describe('PO status'),
      total: z.number().optional().describe('Total amount'),
      date: z.string().optional().describe('PO date'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.string().describe('Purchase order ID'),
      purchaseorderNumber: z.string().optional().describe('PO number'),
      vendorName: z.string().optional().describe('Vendor name'),
      status: z.string().optional().describe('PO status'),
      total: z.number().optional().describe('Total amount'),
      date: z.string().optional().describe('PO date'),
      lastModifiedTime: z.string().optional().describe('Last modified time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let result = await client.listPurchaseOrders({
        sort_column: 'last_modified_time',
        sort_order: 'descending',
        per_page: 25
      });

      let orders = result.purchaseorders || [];
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
        inputs: newOrders.map((po: any) => ({
          purchaseOrderId: String(po.purchaseorder_id),
          purchaseorderNumber: po.purchaseorder_number ?? undefined,
          vendorName: po.vendor_name ?? undefined,
          status: po.status ?? undefined,
          total: po.total ?? undefined,
          date: po.date ?? undefined,
          lastModifiedTime: po.last_modified_time ?? undefined
        })),
        updatedState: {
          lastPolledAt: updatedLastPolled
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'purchase_order.updated',
        id: `po-${ctx.input.purchaseOrderId}-${ctx.input.lastModifiedTime || Date.now()}`,
        output: {
          purchaseOrderId: ctx.input.purchaseOrderId,
          purchaseorderNumber: ctx.input.purchaseorderNumber,
          vendorName: ctx.input.vendorName,
          status: ctx.input.status,
          total: ctx.input.total,
          date: ctx.input.date,
          lastModifiedTime: ctx.input.lastModifiedTime
        }
      };
    }
  })
  .build();
