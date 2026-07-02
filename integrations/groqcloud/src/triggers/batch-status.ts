import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let batchStatus = SlateTrigger.create(spec, {
  name: 'Batch Status Change',
  key: 'batch_status_change',
  description:
    'Monitors batch processing jobs for status changes. Triggers when a batch transitions to a new state (e.g., in_progress, completed, failed, cancelled, expired).'
})
  .input(
    z.object({
      batchId: z.string().describe('Unique identifier of the batch'),
      previousStatus: z.string().optional().describe('Previous status of the batch'),
      currentStatus: z.string().describe('Current status of the batch'),
      batch: z.record(z.string(), z.unknown()).describe('Full batch object')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique identifier of the batch'),
      status: z.string().describe('Current status of the batch'),
      endpoint: z.string().describe('API endpoint for the batch'),
      inputFileId: z.string().describe('ID of the input file'),
      outputFileId: z
        .string()
        .optional()
        .describe('ID of the output file (available when completed)'),
      errorFileId: z.string().optional().describe('ID of the error file'),
      completionWindow: z.string().describe('Processing window'),
      createdAt: z.number().describe('Unix timestamp when batch was created'),
      completedAt: z.number().optional().describe('Unix timestamp when batch completed'),
      failedAt: z.number().optional().describe('Unix timestamp when batch failed'),
      totalRequests: z.number().optional().describe('Total number of requests'),
      completedRequests: z.number().optional().describe('Number of completed requests'),
      failedRequests: z.number().optional().describe('Number of failed requests')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client(ctx.auth.token);

      let result = await client.listBatches();

      let previousStatuses: Record<string, string> =
        (ctx.state?.batchStatuses as Record<string, string>) ?? {};
      let currentStatuses: Record<string, string> = {};
      let inputs: Array<{
        batchId: string;
        previousStatus: string | undefined;
        currentStatus: string;
        batch: Record<string, unknown>;
      }> = [];

      for (let batch of result.data) {
        currentStatuses[batch.id] = batch.status;

        let prevStatus = previousStatuses[batch.id];
        if (prevStatus !== batch.status) {
          inputs.push({
            batchId: batch.id,
            previousStatus: prevStatus,
            currentStatus: batch.status,
            batch: batch as unknown as Record<string, unknown>
          });
        }
      }

      return {
        inputs,
        updatedState: {
          batchStatuses: currentStatuses
        }
      };
    },

    handleEvent: async ctx => {
      let batch = ctx.input.batch as Record<string, unknown>;

      let requestCounts = batch.request_counts as
        | { total?: number; completed?: number; failed?: number }
        | undefined;

      return {
        type: `batch.${ctx.input.currentStatus}`,
        id: `${ctx.input.batchId}-${ctx.input.currentStatus}-${Date.now()}`,
        output: {
          batchId: ctx.input.batchId,
          status: ctx.input.currentStatus,
          endpoint: batch.endpoint as string,
          inputFileId: batch.input_file_id as string,
          outputFileId: batch.output_file_id as string | undefined,
          errorFileId: batch.error_file_id as string | undefined,
          completionWindow: batch.completion_window as string,
          createdAt: batch.created_at as number,
          completedAt: batch.completed_at as number | undefined,
          failedAt: batch.failed_at as number | undefined,
          totalRequests: requestCounts?.total,
          completedRequests: requestCounts?.completed,
          failedRequests: requestCounts?.failed
        }
      };
    }
  })
  .build();
