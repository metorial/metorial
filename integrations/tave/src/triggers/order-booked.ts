import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

export let orderBooked = SlateTrigger.create(spec, {
  name: 'Order Booked',
  key: 'order_booked',
  description:
    'Fires when an order is booked in Tave, including both manually booked orders in the manager interface and electronic bookings made by clients. Can be filtered by brand and job type.'
})
  .input(
    z.object({
      orderId: z.string().describe('ID of the order'),
      jobType: z.string().optional().describe('Job type of the order'),
      brand: z.string().optional().describe('Brand of the order'),
      amount: z.number().optional().describe('Order amount'),
      status: z.string().optional().describe('Order status'),
      createdAt: z.string().optional().describe('When the order was created'),
      raw: z.any().optional().describe('Full order record')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the booked order'),
      jobType: z.string().optional().describe('Job type associated with the order'),
      brand: z.string().optional().describe('Brand associated with the order'),
      amount: z.number().optional().describe('Total order amount'),
      status: z.string().optional().describe('Current status of the order'),
      createdAt: z.string().optional().describe('Timestamp when the order was booked')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TavePublicClient(ctx.auth.token);

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;
      let knownIds = (ctx.state?.knownIds as string[] | undefined) ?? [];

      let params: { since?: string; page?: number; perPage?: number } = {
        perPage: 50
      };

      if (lastPolledAt) {
        params.since = lastPolledAt;
      }

      let result = await client.listOrders(params);
      let items = Array.isArray(result) ? result : (result?.data ?? result?.orders ?? []);

      let newOrders = items.filter((o: any) => {
        let id = String(o.id ?? o.order_id ?? '');
        return !knownIds.includes(id);
      });

      let newIds = newOrders.map((o: any) => String(o.id ?? o.order_id ?? ''));
      let updatedKnownIds = [...knownIds, ...newIds].slice(-500);

      let inputs = newOrders.map((o: any) => ({
        orderId: String(o.id ?? o.order_id ?? ''),
        jobType: o.job_type ?? undefined,
        brand: o.brand ?? undefined,
        amount: o.amount ?? o.total ?? undefined,
        status: o.status ?? undefined,
        createdAt: o.created_at ?? o.created ?? undefined,
        raw: o
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString(),
          knownIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'order.booked',
        id: ctx.input.orderId,
        output: {
          orderId: ctx.input.orderId,
          jobType: ctx.input.jobType,
          brand: ctx.input.brand,
          amount: ctx.input.amount,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
