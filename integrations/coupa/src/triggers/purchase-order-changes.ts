import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

export let purchaseOrderChanges = SlateTrigger.create(spec, {
  name: 'Purchase Order Changes',
  key: 'purchase_order_changes',
  description:
    'Triggers when purchase orders are created or updated in Coupa. Polls for changes based on the updated_at timestamp.'
})
  .input(
    z.object({
      purchaseOrderId: z.number().describe('Purchase order ID'),
      poNumber: z.string().nullable().optional().describe('PO number'),
      status: z.string().nullable().optional().describe('Current PO status'),
      updatedAt: z.string().describe('Last update timestamp'),
      rawData: z.any().describe('Full purchase order data')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.number().describe('Coupa purchase order ID'),
      poNumber: z.string().nullable().optional().describe('PO number'),
      status: z.string().nullable().optional().describe('Current PO status'),
      supplier: z.any().nullable().optional().describe('Supplier object'),
      totalAmount: z.any().nullable().optional().describe('PO total'),
      currency: z.any().nullable().optional().describe('Currency'),
      orderLines: z.array(z.any()).nullable().optional().describe('Order line items'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CoupaClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let filters: Record<string, string> = {};

      if (lastPollTime) {
        filters['updated-at[gt]'] = lastPollTime;
      }

      let results = await client.listPurchaseOrders({
        filters,
        orderBy: 'updated_at',
        dir: 'asc',
        limit: 50
      });

      let pos = Array.isArray(results) ? results : [];

      let newLastPollTime = lastPollTime;
      if (pos.length > 0) {
        let lastPo = pos[pos.length - 1];
        newLastPollTime = lastPo['updated-at'] ?? lastPo.updated_at ?? lastPollTime;
      }

      return {
        inputs: pos.map((po: any) => ({
          purchaseOrderId: po.id,
          poNumber: po['po-number'] ?? po.po_number ?? null,
          status: po.status ?? null,
          updatedAt: po['updated-at'] ?? po.updated_at ?? '',
          rawData: po
        })),
        updatedState: {
          lastPollTime: newLastPollTime ?? new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let po = ctx.input.rawData;

      return {
        type: 'purchase_order.updated',
        id: `po-${ctx.input.purchaseOrderId}-${ctx.input.updatedAt}`,
        output: {
          purchaseOrderId: ctx.input.purchaseOrderId,
          poNumber: ctx.input.poNumber,
          status: ctx.input.status,
          supplier: po.supplier ?? null,
          totalAmount: po.total ?? po.total ?? null,
          currency: po.currency ?? null,
          orderLines: po['order-lines'] ?? po.order_lines ?? null,
          createdAt: po['created-at'] ?? po.created_at ?? null,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
