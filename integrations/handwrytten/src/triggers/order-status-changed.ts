import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderStatusChanged = SlateTrigger.create(spec, {
  name: 'Order Status Changed',
  key: 'order_status_changed',
  description:
    'Triggers when an order status changes (e.g., from processing to written, complete, problem, or cancelled). Polls the order list for status updates.'
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order whose status changed'),
      status: z.string().describe('New status of the order'),
      previousStatus: z.string().optional().describe('Previous status of the order'),
      message: z.string().optional().describe('The handwritten message on the order'),
      recipientName: z.string().optional().describe('Recipient full name'),
      senderName: z.string().optional().describe('Sender full name')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the order'),
      status: z.string().describe('Current order status'),
      previousStatus: z
        .string()
        .optional()
        .describe('Previous order status before the change'),
      message: z.string().optional().describe('The handwritten message'),
      recipientName: z.string().optional().describe('Recipient full name'),
      recipientCity: z.string().optional().describe('Recipient city'),
      recipientState: z.string().optional().describe('Recipient state'),
      senderName: z.string().optional().describe('Sender full name'),
      price: z.string().optional().describe('Order price'),
      dateSend: z.string().optional().describe('Send date')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listOrders();
      let rawOrders = result.orders ?? result.data ?? [];

      let previousStatuses: Record<string, string> = ctx.state?.orderStatuses ?? {};
      let currentStatuses: Record<string, string> = {};
      let inputs: Array<{
        orderId: string;
        status: string;
        previousStatus?: string;
        message?: string;
        recipientName?: string;
        senderName?: string;
      }> = [];

      for (let order of rawOrders) {
        let orderId = String(order.id ?? order.order_id);
        let status = order.status ?? '';
        currentStatuses[orderId] = status;

        let prevStatus = previousStatuses[orderId];
        if (prevStatus !== undefined && prevStatus !== status) {
          let recipientName = order.address_to
            ? [order.address_to.first_name, order.address_to.last_name]
                .filter(Boolean)
                .join(' ') || undefined
            : undefined;
          let senderName = order.address_from
            ? [order.address_from.first_name, order.address_from.last_name]
                .filter(Boolean)
                .join(' ') || undefined
            : undefined;

          inputs.push({
            orderId,
            status,
            previousStatus: prevStatus,
            message: order.message ?? undefined,
            recipientName,
            senderName
          });
        }
      }

      return {
        inputs,
        updatedState: {
          orderStatuses: currentStatuses
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result: any;
      try {
        result = await client.listOrders();
      } catch {
        result = { orders: [] };
      }

      let rawOrders = result.orders ?? result.data ?? [];
      let order = rawOrders.find((o: any) => String(o.id ?? o.order_id) === ctx.input.orderId);

      let recipientCity = order?.address_to?.city ?? undefined;
      let recipientState = order?.address_to?.state ?? undefined;
      let price = order?.price != null ? String(order.price) : undefined;
      let dateSend = order?.date_send ?? undefined;

      return {
        type: `order.${ctx.input.status}`,
        id: `${ctx.input.orderId}-${ctx.input.status}`,
        output: {
          orderId: ctx.input.orderId,
          status: ctx.input.status,
          previousStatus: ctx.input.previousStatus,
          message: ctx.input.message,
          recipientName: ctx.input.recipientName,
          recipientCity,
          recipientState,
          senderName: ctx.input.senderName,
          price,
          dateSend
        }
      };
    }
  })
  .build();
