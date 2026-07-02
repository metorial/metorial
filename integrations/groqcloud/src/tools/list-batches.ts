import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBatches = SlateTool.create(spec, {
  name: 'List Batches',
  key: 'list_batches',
  description: `List all batch processing jobs in your GroqCloud organization. Returns batch IDs, statuses, and progress information for all current and past batches.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      batches: z
        .array(
          z.object({
            batchId: z.string().describe('Unique identifier of the batch'),
            status: z.string().describe('Current status of the batch'),
            endpoint: z.string().describe('API endpoint for the batch'),
            inputFileId: z.string().describe('ID of the input file'),
            outputFileId: z.string().optional().describe('ID of the output file'),
            completionWindow: z.string().describe('Processing window'),
            createdAt: z.number().describe('Unix timestamp when the batch was created'),
            completedAt: z
              .number()
              .optional()
              .describe('Unix timestamp when the batch completed'),
            totalRequests: z.number().optional().describe('Total number of requests'),
            completedRequests: z.number().optional().describe('Number of completed requests'),
            failedRequests: z.number().optional().describe('Number of failed requests')
          })
        )
        .describe('List of batch jobs'),
      totalCount: z.number().describe('Total number of batches returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listBatches();

    let batches = result.data.map(b => ({
      batchId: b.id,
      status: b.status,
      endpoint: b.endpoint,
      inputFileId: b.input_file_id,
      outputFileId: b.output_file_id,
      completionWindow: b.completion_window,
      createdAt: b.created_at,
      completedAt: b.completed_at,
      totalRequests: b.request_counts?.total,
      completedRequests: b.request_counts?.completed,
      failedRequests: b.request_counts?.failed
    }));

    return {
      output: {
        batches,
        totalCount: batches.length
      },
      message: `Found **${batches.length}** batch jobs.`
    };
  })
  .build();
