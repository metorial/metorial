import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newOrders = SlateTrigger.create(spec, {
  name: 'New Orders',
  key: 'new_orders',
  description:
    'Triggers when new orders are placed for your Humanitix events. Polls all events on your account and detects newly created orders.'
})
  .input(
    z.object({
      orderId: z.string().describe('Internal order ID'),
      eventId: z.string().describe('Event ID the order belongs to'),
      order: z.any().describe('Full order data from the API')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Internal unique order ID'),
      orderName: z.string().optional().describe('Buyer-facing order name/reference'),
      firstName: z.string().optional().describe('Buyer first name'),
      lastName: z.string().optional().describe('Buyer last name'),
      email: z.string().optional().describe('Buyer email address'),
      mobile: z.string().optional().describe('Buyer mobile number'),
      status: z.string().optional().describe('Order status'),
      financialStatus: z.string().optional().describe('Financial status of the order'),
      paymentType: z.string().optional().describe('Payment method used'),
      purchaseTotals: z.any().optional().describe('Purchase totals breakdown'),
      totals: z.any().optional().describe('Itemized totals including fees and taxes'),
      eventId: z.string().optional().describe('ID of the associated event'),
      eventDateId: z.string().optional().describe('ID of the specific event date'),
      createdAt: z.string().optional().describe('When the order was created'),
      completedAt: z.string().optional().describe('When the order was completed'),
      updatedAt: z.string().optional().describe('When the order was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let knownOrderIds: Record<string, boolean> = ctx.state?.knownOrderIds || {};
      let isFirstRun = !ctx.state?.initialized;

      let eventsResponse = await client.getEvents({ page: 1, pageSize: 100 });
      let events = eventsResponse.events || [];

      let newInputs: Array<{ orderId: string; eventId: string; order: any }> = [];
      let updatedKnownOrderIds: Record<string, boolean> = { ...knownOrderIds };

      for (let event of events) {
        let eventId = event._id;
        let ordersResponse = await client.getOrders(eventId, { page: 1, pageSize: 100 });
        let orders = ordersResponse.orders || [];

        for (let order of orders) {
          if (!updatedKnownOrderIds[order._id]) {
            updatedKnownOrderIds[order._id] = true;

            if (!isFirstRun) {
              newInputs.push({
                orderId: order._id,
                eventId,
                order
              });
            }
          }
        }
      }

      return {
        inputs: newInputs,
        updatedState: {
          knownOrderIds: updatedKnownOrderIds,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      let order = ctx.input.order;

      return {
        type: 'order.created',
        id: ctx.input.orderId,
        output: {
          orderId: order._id,
          orderName: order.orderName,
          firstName: order.firstName,
          lastName: order.lastName,
          email: order.email,
          mobile: order.mobile,
          status: order.status,
          financialStatus: order.financialStatus,
          paymentType: order.paymentType,
          purchaseTotals: order.purchaseTotals,
          totals: order.totals,
          eventId: order.eventId || ctx.input.eventId,
          eventDateId: order.eventDateId,
          createdAt: order.createdAt,
          completedAt: order.completedAt,
          updatedAt: order.updatedAt
        }
      };
    }
  })
  .build();
