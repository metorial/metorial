import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchCompleted = SlateTrigger.create(spec, {
  name: 'Batch Verification Completed',
  key: 'batch_completed',
  description:
    'Triggers when an asynchronous batch email verification job completes processing. Polls for status changes on tracked batch IDs.'
})
  .input(
    z.object({
      batchId: z.string().describe('Batch verification job identifier'),
      status: z.string().describe('Current batch status'),
      quantity: z.number().describe('Total emails in the batch'),
      created: z.string().describe('ISO 8601 timestamp when the batch was created'),
      completed: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when processing completed'),
      credits: z.number().optional().describe('Credits consumed'),
      stats: z
        .object({
          deliverable: z.number(),
          risky: z.number(),
          undeliverable: z.number(),
          unknown: z.number()
        })
        .optional()
        .describe('Breakdown of results by status')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Batch verification job identifier'),
      status: z.string().describe('Batch completion status'),
      quantity: z.number().describe('Total emails in the batch'),
      created: z.string().describe('ISO 8601 timestamp when the batch was created'),
      completed: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when processing completed'),
      credits: z.number().optional().describe('Credits consumed'),
      deliverable: z.number().optional().describe('Count of deliverable emails'),
      risky: z.number().optional().describe('Count of risky emails'),
      undeliverable: z.number().optional().describe('Count of undeliverable emails'),
      unknown: z.number().optional().describe('Count of unknown emails')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let trackedBatchIds: string[] = ctx.state?.trackedBatchIds ?? [];
      let completedBatchIds: string[] = ctx.state?.completedBatchIds ?? [];

      let inputs: Array<{
        batchId: string;
        status: string;
        quantity: number;
        created: string;
        completed?: string;
        credits?: number;
        stats?: {
          deliverable: number;
          risky: number;
          undeliverable: number;
          unknown: number;
        };
      }> = [];

      let stillTracking: string[] = [];

      for (let batchId of trackedBatchIds) {
        if (completedBatchIds.includes(batchId)) {
          continue;
        }

        try {
          let status = await client.getBatchStatus(batchId, true);

          if (status.status === 'completed') {
            inputs.push({
              batchId: status.batchId,
              status: status.status,
              quantity: status.quantity,
              created: status.created,
              completed: status.completed,
              credits: status.credits,
              stats: status.stats
            });
            completedBatchIds.push(batchId);
          } else {
            stillTracking.push(batchId);
          }
        } catch {
          stillTracking.push(batchId);
        }
      }

      return {
        inputs,
        updatedState: {
          trackedBatchIds: stillTracking,
          completedBatchIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'batch.completed',
        id: `batch_completed_${ctx.input.batchId}`,
        output: {
          batchId: ctx.input.batchId,
          status: ctx.input.status,
          quantity: ctx.input.quantity,
          created: ctx.input.created,
          completed: ctx.input.completed,
          credits: ctx.input.credits,
          deliverable: ctx.input.stats?.deliverable,
          risky: ctx.input.stats?.risky,
          undeliverable: ctx.input.stats?.undeliverable,
          unknown: ctx.input.stats?.unknown
        }
      };
    }
  })
  .build();
