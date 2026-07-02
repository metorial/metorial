import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

export let paymentCreated = SlateTrigger.create(spec, {
  name: 'Payment Created',
  key: 'payment_created',
  description:
    'Fires when a new payment is recorded in Tave. Can be filtered by brand and job type.'
})
  .input(
    z.object({
      paymentId: z.string().describe('ID of the payment'),
      jobType: z.string().optional().describe('Job type associated with the payment'),
      brand: z.string().optional().describe('Brand associated with the payment'),
      amount: z.number().optional().describe('Payment amount'),
      status: z.string().optional().describe('Payment status'),
      createdAt: z.string().optional().describe('When the payment was created'),
      raw: z.any().optional().describe('Full payment record')
    })
  )
  .output(
    z.object({
      paymentId: z.string().describe('ID of the payment'),
      jobType: z.string().optional().describe('Job type associated with the payment'),
      brand: z.string().optional().describe('Brand associated with the payment'),
      amount: z.number().optional().describe('Payment amount'),
      status: z.string().optional().describe('Payment status'),
      createdAt: z.string().optional().describe('Timestamp when the payment was created')
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

      let result = await client.listPayments(params);
      let items = Array.isArray(result) ? result : (result?.data ?? result?.payments ?? []);

      let newPayments = items.filter((p: any) => {
        let id = String(p.id ?? p.payment_id ?? '');
        return !knownIds.includes(id);
      });

      let newIds = newPayments.map((p: any) => String(p.id ?? p.payment_id ?? ''));
      let updatedKnownIds = [...knownIds, ...newIds].slice(-500);

      let inputs = newPayments.map((p: any) => ({
        paymentId: String(p.id ?? p.payment_id ?? ''),
        jobType: p.job_type ?? undefined,
        brand: p.brand ?? undefined,
        amount: p.amount ?? p.total ?? undefined,
        status: p.status ?? undefined,
        createdAt: p.created_at ?? p.created ?? undefined,
        raw: p
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
        type: 'payment.created',
        id: ctx.input.paymentId,
        output: {
          paymentId: ctx.input.paymentId,
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
