import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEstimateTrigger = SlateTrigger.create(spec, {
  name: 'New Estimate',
  key: 'new_estimate',
  description: 'Triggers when a new estimate is created in Agiled.'
})
  .input(
    z.object({
      estimateId: z.string().describe('ID of the estimate'),
      estimate: z.record(z.string(), z.unknown()).describe('Estimate record from Agiled')
    })
  )
  .output(
    z.object({
      estimateId: z.string().describe('ID of the new estimate'),
      estimateNumber: z.string().optional().describe('Estimate number'),
      clientId: z.string().optional().describe('Client ID'),
      total: z.string().optional().describe('Estimate total amount'),
      status: z.string().optional().describe('Estimate status'),
      validTill: z.string().optional().describe('Valid until date'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        brand: ctx.auth.brand
      });

      let lastKnownId = (ctx.state as Record<string, unknown>)?.lastKnownId as
        | number
        | undefined;

      let result = await client.listEstimates(1, 50);
      let estimates = result.data;

      let newEstimates = lastKnownId ? estimates.filter(e => Number(e.id) > lastKnownId) : [];

      let maxId = estimates.reduce(
        (max, e) => Math.max(max, Number(e.id) || 0),
        lastKnownId ?? 0
      );

      return {
        inputs: newEstimates.map(e => ({
          estimateId: String(e.id),
          estimate: e
        })),
        updatedState: {
          lastKnownId: maxId
        }
      };
    },

    handleEvent: async ctx => {
      let e = ctx.input.estimate;
      return {
        type: 'estimate.created',
        id: ctx.input.estimateId,
        output: {
          estimateId: ctx.input.estimateId,
          estimateNumber: e.estimate_number as string | undefined,
          clientId: e.client_id != null ? String(e.client_id) : undefined,
          total: e.total != null ? String(e.total) : undefined,
          status: e.status as string | undefined,
          validTill: e.valid_till as string | undefined,
          createdAt: e.created_at as string | undefined
        }
      };
    }
  })
  .build();
