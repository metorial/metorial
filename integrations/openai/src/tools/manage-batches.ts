import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let batchOutputSchema = z.object({
  batchId: z.string().describe('Batch identifier'),
  endpoint: z.string().describe('API endpoint for the batch requests'),
  status: z
    .string()
    .describe(
      'Current status (e.g. "validating", "in_progress", "completed", "failed", "expired", "cancelled")'
    ),
  inputFileId: z.string().describe('Input file ID'),
  outputFileId: z.string().nullable().describe('Output file ID (available when completed)'),
  errorFileId: z
    .string()
    .nullable()
    .describe('Error file ID (available when completed with errors)'),
  createdAt: z.number().describe('Unix timestamp when created'),
  completedAt: z.number().nullable().describe('Unix timestamp when completed'),
  requestCounts: z
    .object({
      total: z.number(),
      completed: z.number(),
      failed: z.number()
    })
    .describe('Request processing counts')
});

export let createBatch = SlateTool.create(spec, {
  name: 'Create Batch',
  key: 'create_batch',
  description: `Submit a batch of API requests for asynchronous processing at reduced cost. Supports Responses, chat completions, embeddings, completions, and moderations endpoints. The input must be a JSONL file uploaded via the Files API.`,
  instructions: [
    'Upload a JSONL file with purpose "batch" before creating a batch. Each line should contain a request object.',
    'The completion_window is typically "24h" for standard processing.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      inputFileId: z
        .string()
        .describe('ID of the uploaded JSONL file containing batch requests'),
      endpoint: z
        .enum([
          '/v1/responses',
          '/v1/chat/completions',
          '/v1/embeddings',
          '/v1/completions',
          '/v1/moderations'
        ])
        .describe('API endpoint for the batch requests'),
      completionWindow: z
        .string()
        .optional()
        .default('24h')
        .describe('Time window for batch completion (e.g. "24h")'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata for the batch')
    })
  )
  .output(batchOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createBatch({
      inputFileId: ctx.input.inputFileId,
      endpoint: ctx.input.endpoint,
      completionWindow: ctx.input.completionWindow,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        batchId: result.id,
        endpoint: result.endpoint,
        status: result.status,
        inputFileId: result.input_file_id,
        outputFileId: result.output_file_id ?? null,
        errorFileId: result.error_file_id ?? null,
        createdAt: result.created_at,
        completedAt: result.completed_at ?? null,
        requestCounts: {
          total: result.request_counts?.total ?? 0,
          completed: result.request_counts?.completed ?? 0,
          failed: result.request_counts?.failed ?? 0
        }
      },
      message: `Created batch **${result.id}** for ${result.endpoint}. Status: ${result.status}.`
    };
  })
  .build();

export let getBatch = SlateTool.create(spec, {
  name: 'Get Batch',
  key: 'get_batch',
  description: `Retrieve the status and details of a batch processing job, or list all batches. Returns processing progress, output file IDs, and error information.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      batchId: z
        .string()
        .optional()
        .describe('Batch ID to retrieve. If omitted, lists recent batches.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of batches to return when listing'),
      after: z.string().optional().describe('Cursor for pagination when listing')
    })
  )
  .output(
    z.object({
      batches: z.array(batchOutputSchema).describe('Batch jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.batchId) {
      let result = await client.getBatch(ctx.input.batchId);
      let batch = {
        batchId: result.id,
        endpoint: result.endpoint,
        status: result.status,
        inputFileId: result.input_file_id,
        outputFileId: result.output_file_id ?? null,
        errorFileId: result.error_file_id ?? null,
        createdAt: result.created_at,
        completedAt: result.completed_at ?? null,
        requestCounts: {
          total: result.request_counts?.total ?? 0,
          completed: result.request_counts?.completed ?? 0,
          failed: result.request_counts?.failed ?? 0
        }
      };

      return {
        output: { batches: [batch] },
        message: `Batch **${result.id}**: status **${result.status}** (${result.request_counts?.completed ?? 0}/${result.request_counts?.total ?? 0} completed).`
      };
    }

    let result = await client.listBatches({ limit: ctx.input.limit, after: ctx.input.after });
    let batches = (result.data ?? []).map((b: any) => ({
      batchId: b.id,
      endpoint: b.endpoint,
      status: b.status,
      inputFileId: b.input_file_id,
      outputFileId: b.output_file_id ?? null,
      errorFileId: b.error_file_id ?? null,
      createdAt: b.created_at,
      completedAt: b.completed_at ?? null,
      requestCounts: {
        total: b.request_counts?.total ?? 0,
        completed: b.request_counts?.completed ?? 0,
        failed: b.request_counts?.failed ?? 0
      }
    }));

    return {
      output: { batches },
      message: `Found **${batches.length}** batch(es).`
    };
  })
  .build();

export let cancelBatch = SlateTool.create(spec, {
  name: 'Cancel Batch',
  key: 'cancel_batch',
  description: `Cancel a batch processing job that is in progress. Already-completed requests within the batch will still be available.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      batchId: z.string().describe('Batch ID to cancel')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Batch identifier'),
      status: z.string().describe('Updated status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.cancelBatch(ctx.input.batchId);

    return {
      output: {
        batchId: result.id,
        status: result.status
      },
      message: `Cancelled batch **${result.id}**. Status: ${result.status}.`
    };
  })
  .build();
