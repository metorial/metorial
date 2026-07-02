import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

let LOG_TYPE_LABELS: Record<number, string> = {
  1: 'order.created',
  2: 'order.status_changed',
  3: 'order.removed',
  4: 'order.payment_received',
  5: 'order.invoice_issued',
  6: 'order.product_added',
  7: 'order.product_removed',
  8: 'order.shipment_created',
  9: 'order.merged',
  10: 'order.split',
  11: 'order.field_changed',
  12: 'order.note_added',
  13: 'order.receipt_printed',
  14: 'order.product_edited',
  15: 'order.package_label_printed',
  16: 'order.shipment_collected',
  17: 'order.refund_created',
  18: 'order.duplicate_created',
  19: 'order.return_created',
  20: 'order.unmerged',
  21: 'order.proforma_invoice_issued',
  22: 'order.correction_invoice_issued'
};

export let orderEvents = SlateTrigger.create(spec, {
  name: 'Order Events',
  key: 'order_events',
  description:
    'Polls the BaseLinker order journal for events such as order creation, status changes, removals, payments, shipments, and more. Events are available for the last 3 days. Must be enabled in BaseLinker API settings.'
})
  .input(
    z.object({
      logId: z.number().describe('Journal log entry ID'),
      logType: z.number().describe('Event type number'),
      orderId: z.number().describe('Associated order ID'),
      objectId: z
        .number()
        .describe('Context-dependent object ID (e.g. merged order ID, invoice ID, parcel ID)'),
      timestamp: z.number().describe('Event timestamp as unix time')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Associated order ID'),
      logType: z.number().describe('Event type number'),
      logTypeLabel: z.string().describe('Human-readable event type label'),
      objectId: z.number().describe('Context-dependent object ID'),
      timestamp: z.number().describe('Event timestamp as unix time')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BaseLinkerClient({ token: ctx.auth.token });

      let lastLogId = (ctx.state as any)?.lastLogId as number | undefined;

      let result = await client.getJournalList({
        lastLogId: lastLogId || 0
      });

      let logs: Array<{
        id: number;
        order_id: number;
        log_type: number;
        object_id: number;
        date: number;
      }> = result.logs || [];

      let newLastLogId = lastLogId || 0;
      if (logs.length > 0) {
        newLastLogId = Math.max(...logs.map(l => l.id));
      }

      return {
        inputs: logs.map(log => ({
          logId: log.id,
          logType: log.log_type,
          orderId: log.order_id,
          objectId: log.object_id,
          timestamp: log.date
        })),
        updatedState: {
          lastLogId: newLastLogId
        }
      };
    },

    handleEvent: async ctx => {
      let logTypeLabel =
        LOG_TYPE_LABELS[ctx.input.logType] || `order.unknown_${ctx.input.logType}`;

      return {
        type: logTypeLabel,
        id: String(ctx.input.logId),
        output: {
          orderId: ctx.input.orderId,
          logType: ctx.input.logType,
          logTypeLabel,
          objectId: ctx.input.objectId,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
