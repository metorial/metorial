import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBatch = SlateTool.create(spec, {
  name: 'Get Batch',
  key: 'get_batch',
  description: `Retrieve the status and details of a batch processing job on GroqCloud. Returns current status, progress counts, and output file information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z.string().describe('Unique identifier of the batch job to retrieve')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique identifier of the batch'),
      status: z
        .string()
        .describe(
          'Current status: validating, failed, in_progress, finalizing, completed, expired, cancelling, or cancelled'
        ),
      endpoint: z.string().describe('API endpoint for the batch'),
      inputFileId: z.string().describe('ID of the input file'),
      outputFileId: z
        .string()
        .optional()
        .describe('ID of the output file (available when completed)'),
      errorFileId: z
        .string()
        .optional()
        .describe('ID of the error file (available if errors occurred)'),
      completionWindow: z.string().describe('Processing window'),
      createdAt: z.number().describe('Unix timestamp when the batch was created'),
      completedAt: z.number().optional().describe('Unix timestamp when the batch completed'),
      failedAt: z.number().optional().describe('Unix timestamp when the batch failed'),
      totalRequests: z.number().optional().describe('Total number of requests in the batch'),
      completedRequests: z.number().optional().describe('Number of completed requests'),
      failedRequests: z.number().optional().describe('Number of failed requests'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata attached to the batch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let batch = await client.getBatch(ctx.input.batchId);

    return {
      output: {
        batchId: batch.id,
        status: batch.status,
        endpoint: batch.endpoint,
        inputFileId: batch.input_file_id,
        outputFileId: batch.output_file_id,
        errorFileId: batch.error_file_id,
        completionWindow: batch.completion_window,
        createdAt: batch.created_at,
        completedAt: batch.completed_at,
        failedAt: batch.failed_at,
        totalRequests: batch.request_counts?.total,
        completedRequests: batch.request_counts?.completed,
        failedRequests: batch.request_counts?.failed,
        metadata: batch.metadata
      },
      message: `Batch **${batch.id}** status: **${batch.status}**. ${batch.request_counts ? `Progress: ${batch.request_counts.completed}/${batch.request_counts.total} completed, ${batch.request_counts.failed} failed.` : ''}`
    };
  })
  .build();
