import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { groqCloudServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createBatch = SlateTool.create(spec, {
  name: 'Create Batch',
  key: 'create_batch',
  description: `Create a batch processing job on GroqCloud. Use an uploaded batch JSONL file or provide JSONL content to upload and create the batch in one step. Each line should contain a request object with custom_id, method, url, and body fields for the chat completions endpoint.`,
  instructions: [
    'Provide exactly one of inputFileId or jsonlContent.',
    'JSONL lines must be objects with custom_id, method ("POST"), url "/v1/chat/completions", and body.',
    'The batch will be processed within the specified completion window (24h to 7d).',
    'Use Get Batch to poll for status and Download File to retrieve outputFileId or errorFileId contents.'
  ],
  constraints: [
    'Maximum file size: 100 MB',
    'Supported endpoint: /v1/chat/completions',
    'Completion window: 24h to 7d'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      inputFileId: z
        .string()
        .optional()
        .describe(
          'Existing uploaded batch file ID. Provide either inputFileId or jsonlContent'
        ),
      jsonlContent: z
        .string()
        .optional()
        .describe(
          'JSONL content to upload before creating the batch. Provide either jsonlContent or inputFileId'
        ),
      filename: z
        .string()
        .optional()
        .default('batch_input.jsonl')
        .describe('Filename to use when uploading jsonlContent'),
      endpoint: z
        .enum(['/v1/chat/completions'])
        .default('/v1/chat/completions')
        .describe('API endpoint for the batch requests'),
      completionWindow: z
        .string()
        .default('24h')
        .describe('Processing time window (e.g., "24h", "7d")'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata for the batch')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Unique identifier for the batch job'),
      status: z.string().describe('Current status of the batch'),
      endpoint: z.string().describe('API endpoint for the batch'),
      inputFileId: z.string().describe('ID of the uploaded input file'),
      completionWindow: z.string().describe('Processing window'),
      createdAt: z.number().describe('Unix timestamp when the batch was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let hasInputFileId =
      ctx.input.inputFileId !== undefined && ctx.input.inputFileId.trim().length > 0;
    let hasJsonlContent =
      ctx.input.jsonlContent !== undefined && ctx.input.jsonlContent.trim().length > 0;

    if (hasInputFileId === hasJsonlContent) {
      throw groqCloudServiceError(
        'Provide exactly one of inputFileId or jsonlContent when creating a batch.'
      );
    }

    let inputFileId = ctx.input.inputFileId;

    if (hasJsonlContent) {
      ctx.info('Uploading batch file...');
      let file = await client.uploadFile(ctx.input.jsonlContent!, ctx.input.filename);
      ctx.info(`File uploaded: ${file.id}`);
      inputFileId = file.id;
    }

    let batch = await client.createBatch({
      inputFileId: inputFileId!,
      endpoint: ctx.input.endpoint,
      completionWindow: ctx.input.completionWindow,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        batchId: batch.id,
        status: batch.status,
        endpoint: batch.endpoint,
        inputFileId: batch.input_file_id,
        completionWindow: batch.completion_window,
        createdAt: batch.created_at
      },
      message: `Created batch job **${batch.id}** with status "${batch.status}". Endpoint: ${batch.endpoint}. Completion window: ${batch.completion_window}.`
    };
  })
  .build();
