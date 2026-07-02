import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBatch = SlateTool.create(spec, {
  name: 'Create Batch',
  key: 'create_batch',
  description: `Create a batch processing job on GroqCloud. Upload a JSONL file of API requests to be processed asynchronously at 50% lower cost. Supports chat completions, audio transcriptions, and translations. Each line in the JSONL content should contain a request object with custom_id, method, url, and body fields.`,
  instructions: [
    'Provide JSONL content where each line is a JSON object with: custom_id, method ("POST"), url (e.g., "/v1/chat/completions"), and body (the request payload).',
    'The batch will be processed within the specified completion window (24h to 7d).',
    'Use the Get Batch tool to poll for completion status.'
  ],
  constraints: [
    'Maximum file size: 100 MB',
    'Supported endpoints: /v1/chat/completions, /v1/audio/transcriptions, /v1/audio/translations',
    'Completion window: 24h to 7d'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jsonlContent: z
        .string()
        .describe(
          'JSONL content where each line is a batch request object with custom_id, method, url, and body fields'
        ),
      endpoint: z
        .enum(['/v1/chat/completions', '/v1/audio/transcriptions', '/v1/audio/translations'])
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

    ctx.info('Uploading batch file...');
    let file = await client.uploadFile(ctx.input.jsonlContent, 'batch_input.jsonl');
    ctx.info(`File uploaded: ${file.id}`);

    let batch = await client.createBatch({
      inputFileId: file.id,
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
