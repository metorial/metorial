import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let orderStatusUpdated = SlateTrigger.create(spec, {
  name: 'Order Status Updated',
  key: 'order_status_updated',
  description:
    'Triggers when the status of an e-commerce order is updated. Polls the orders table for recently modified orders.'
})
  .input(
    z.object({
      orderId: z.string().describe('Unique ID of the order.'),
      updatedAt: z.string().describe('Timestamp when the order was last updated.'),
      status: z.string().describe('The new status of the order.'),
      orderData: z.record(z.string(), z.any()).describe('Full order details.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique ID of the order.'),
      updatedAt: z.string().describe('Timestamp when the order was last updated.'),
      status: z.string().describe('The current status of the order after update.'),
      orderData: z
        .record(z.string(), z.any())
        .describe('Full order details including items, customer info, and totals.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new AppDragClient({
        apiKey: ctx.auth.token,
        appId: ctx.config.appId
      });

      let lastTimestamp = (ctx.state as any)?.lastTimestamp || '1970-01-01 00:00:00';

      let result = await client.sqlSelect(
        `SELECT * FROM AD_ORDER WHERE updatedAt > '${lastTimestamp}' ORDER BY updatedAt DESC LIMIT 100`
      );

      let rows: any[] = Array.isArray(result) ? result : result?.Table || [];

      let inputs = rows.map((row: any) => {
        let { id, updatedAt, status } = row;
        return {
          orderId: String(id || row.ID || ''),
          updatedAt: String(updatedAt || row.UpdatedAt || ''),
          status: String(status || row.Status || ''),
          orderData: row
        };
      });

      let newLastTimestamp =
        rows.length > 0
          ? String(rows[0]!.updatedAt || rows[0]!.UpdatedAt || lastTimestamp)
          : lastTimestamp;

      return {
        inputs,
        updatedState: {
          lastTimestamp: newLastTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order.status_updated',
        id: `${ctx.input.orderId}-${ctx.input.updatedAt}`,
        output: {
          orderId: ctx.input.orderId,
          updatedAt: ctx.input.updatedAt,
          status: ctx.input.status,
          orderData: ctx.input.orderData
        }
      };
    }
  })
  .build();
