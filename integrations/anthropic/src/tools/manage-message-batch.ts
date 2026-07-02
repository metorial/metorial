import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnthropicClient } from '../lib/client';
import { anthropicServiceError } from '../lib/errors';
import { spec } from '../spec';

let batchRequestSchema = z.object({
  customId: z.string().describe('Unique identifier for matching results to this request'),
  params: z
    .record(z.string(), z.unknown())
    .describe('Standard Messages API parameters (model, max_tokens, messages, etc.)')
});

let requestCountsSchema = z
  .object({
    processing: z.number(),
    succeeded: z.number(),
    errored: z.number(),
    canceled: z.number(),
    expired: z.number()
  })
  .optional();

let batchOutputSchema = z.object({
  batchId: z.string().describe('Batch ID'),
  type: z.string().optional(),
  processingStatus: z
    .string()
    .optional()
    .describe('Current status: queued, in_progress, succeeded, failed, expired, canceled'),
  requestCounts: requestCountsSchema.describe('Counts of requests by status'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
  expiresAt: z.string().optional().describe('ISO 8601 expiration timestamp'),
  resultsUrl: z.string().optional().describe('URL to download batch results when complete')
});

export let manageMessageBatch = SlateTool.create(spec, {
  name: 'Manage Message Batch',
  key: 'manage_message_batch',
  description: `Create, retrieve, list, or cancel message batches for asynchronous processing. Batches allow processing large volumes of messages at reduced cost (up to 24 hours).
Use **action** to specify the operation: "create", "get", "list", or "cancel".`,
  instructions: [
    'For "create": provide requests array with customId and params for each message.',
    'For "get": provide batchId to check status and retrieve the results URL.',
    'For "cancel": provide batchId to cancel an in-progress batch.',
    'For "list": optionally provide limit and afterId for pagination.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'list', 'cancel']).describe('Operation to perform'),
      batchId: z.string().optional().describe('Batch ID (required for "get" and "cancel")'),
      requests: z
        .array(batchRequestSchema)
        .optional()
        .describe('Batch requests (required for "create")'),
      limit: z.number().optional().describe('Max results to return (for "list")'),
      afterId: z.string().optional().describe('Pagination cursor after this batch ID'),
      beforeId: z.string().optional().describe('Pagination cursor before this batch ID'),
      betaHeaders: z
        .array(z.string())
        .optional()
        .describe('Anthropic beta headers to send when creating the batch')
    })
  )
  .output(
    z.object({
      batch: batchOutputSchema
        .optional()
        .describe('Single batch result (for create, get, cancel)'),
      batches: z.array(batchOutputSchema).optional().describe('List of batches (for list)'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnthropicClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.requests || ctx.input.requests.length === 0) {
        throw anthropicServiceError('requests array is required for "create" action');
      }
      let batch = await client.createMessageBatch(ctx.input.requests, ctx.input.betaHeaders);
      return {
        output: { batch, batches: undefined, hasMore: undefined },
        message: `Created message batch **${batch.batchId}** with **${ctx.input.requests.length}** request(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.batchId) {
        throw anthropicServiceError('batchId is required for "get" action');
      }
      let batch = await client.getMessageBatch(ctx.input.batchId);
      return {
        output: { batch, batches: undefined, hasMore: undefined },
        message: `Batch **${batch.batchId}** status: **${batch.processingStatus}**.`
      };
    }

    if (action === 'list') {
      let result = await client.listMessageBatches({
        limit: ctx.input.limit,
        afterId: ctx.input.afterId,
        beforeId: ctx.input.beforeId
      });
      return {
        output: { batch: undefined, batches: result.batches, hasMore: result.hasMore },
        message: `Found **${result.batches.length}** batch(es).${result.hasMore ? ' More available with pagination.' : ''}`
      };
    }

    // cancel
    if (!ctx.input.batchId) {
      throw anthropicServiceError('batchId is required for "cancel" action');
    }
    let batch = await client.cancelMessageBatch(ctx.input.batchId);
    return {
      output: { batch, batches: undefined, hasMore: undefined },
      message: `Cancelled batch **${batch.batchId}**.`
    };
  })
  .build();
