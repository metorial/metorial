import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let newOrder = SlateTrigger.create(spec, {
  name: 'New Order',
  key: 'new_order',
  description:
    'Triggers when a new e-commerce order is placed. Polls the orders table for newly created orders.'
})
  .input(
    z.object({
      orderId: z.string().describe('Unique ID of the order.'),
      createdAt: z.string().describe('Timestamp when the order was created.'),
      status: z.string().describe('Current status of the order.'),
      orderData: z.record(z.string(), z.any()).describe('Full order details.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique ID of the order.'),
      createdAt: z.string().describe('Timestamp when the order was created.'),
      status: z.string().describe('Current status of the order.'),
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
        `SELECT * FROM AD_ORDER WHERE createdAt > '${lastTimestamp}' ORDER BY createdAt DESC LIMIT 100`
      );

      let rows: any[] = Array.isArray(result) ? result : result?.Table || [];

      let inputs = rows.map((row: any) => {
        let { id, createdAt, status } = row;
        return {
          orderId: String(id || row.ID || ''),
          createdAt: String(createdAt || ''),
          status: String(status || row.Status || ''),
          orderData: row
        };
      });

      let newLastTimestamp =
        rows.length > 0
          ? String(rows[0]!.createdAt || rows[0]!.CreatedAt || lastTimestamp)
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
        type: 'order.created',
        id: ctx.input.orderId,
        output: {
          orderId: ctx.input.orderId,
          createdAt: ctx.input.createdAt,
          status: ctx.input.status,
          orderData: ctx.input.orderData
        }
      };
    }
  })
  .build();
