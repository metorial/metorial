import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { ContextClient, pathId } from '../lib/client';
import { batchResultsSchema, deliverInlineImages, prepareBatch } from '../lib/files';
import { cacheMetadataSchema, responseMetadata } from '../lib/response';
import { contextTool } from '../lib/tools';
import { validatePageRange } from './web';

const batchStatusSchema = z.enum([
  'queued',
  'running',
  'cancelling',
  'completed',
  'cancelled',
  'failed'
]);
const batchSchema = z
  .object({
    id: z.string().describe('Batch ID for progress, results, cancellation, and deletion.'),
    status: batchStatusSchema,
    mode: z.enum(['scrape', 'crawl']),
    format: z.enum(['markdown', 'html']),
    tags: z.array(z.string()),
    crawl: z.record(z.string(), z.unknown()).nullable(),
    input: z
      .object({
        reserved: z.number().int(),
        reserved_is_ceiling: z.boolean(),
        submitted: z.number().int().nullable(),
        duplicates: z.number().int(),
        invalid: z.number().int().nullable()
      })
      .passthrough(),
    credits: z
      .object({
        reserved: z.number().int(),
        refunded: z.number().int().optional(),
        ocr_charged: z.number().int().optional(),
        net: z.number().int().optional()
      })
      .passthrough(),
    progress: z
      .object({
        succeeded: z.number().int(),
        failed: z.number().int(),
        pending: z.number().int()
      })
      .passthrough()
      .optional(),
    timing: z
      .object({
        created_at: z.string(),
        started_at: z.string().nullable(),
        completed_at: z.string().nullable().optional()
      })
      .passthrough()
      .optional(),
    created_at: z.string().optional(),
    invalid_urls: z
      .array(z.object({ url: z.string(), reason: z.string() }).passthrough())
      .optional(),
    page_errors: z
      .array(z.object({ code: z.string(), count: z.number().int() }).passthrough())
      .optional(),
    failure: z.record(z.string(), z.unknown()).nullable().optional(),
    results: batchResultsSchema.optional(),
    cache_metadata: cacheMetadataSchema.optional(),
    webhook_secret: z
      .string()
      .optional()
      .describe(
        'One-time secret for verifying the configured webhook. Store it when returned.'
      ),
    webhook_delivery_id: z.string().optional(),
    ...responseMetadata
  })
  .passthrough();

const resultRecordSchema = z
  .object({
    url: z.string(),
    status: z.enum(['ok', 'error']),
    itemId: z.string().optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
    http_status: z.number().int().nullable().optional(),
    final_url: z.string().optional(),
    markdown: z.string().optional(),
    html: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    cache_metadata: cacheMetadataSchema.optional(),
    ocr_pages: z.number().int().optional(),
    error_code: z.string().optional(),
    message: z.string().optional()
  })
  .passthrough();

const batchListSchema = z
  .object({
    data: z.array(batchSchema.omit({ request_id: true, key_metadata: true })),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    ...responseMetadata
  })
  .passthrough();
const resultsSchema = z
  .object({
    data: z.array(resultRecordSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable(),
    ...responseMetadata
  })
  .passthrough();
const deletedSchema = z
  .object({ id: z.string(), deleted: z.boolean(), ...responseMetadata })
  .passthrough();

export const submitBatch = contextTool('submit-batch', {
  instructions: [
    'Save the batch ID and poll get_batch explicitly. Request get_batch_results when processing has finished. Save webhook_secret when returned; it is shown once.'
  ]
})
  .output(batchSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.webhook !== undefined && ctx.input.webhookUrl !== undefined) {
      throw createApiServiceError('Provide webhook or webhookUrl, not both.');
    }
    const delays = ctx.input.webhook?.retry?.delays_seconds;
    if (
      delays &&
      delays.reduce((sum: number, delay: number) => sum + delay, 0) > 72 * 60 * 60
    ) {
      throw createApiServiceError('The webhook retry delays must total at most 72 hours.');
    }
    validatePageRange(ctx.input.input.data.options?.pdf, 'input.data.options.pdf');
    const { 'Idempotency-Key': idempotencyKey, ...body } = ctx.input;
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof batchSchema>
    >('submit batch', {
      method: 'POST',
      path: '/batch/submit',
      body,
      ...(idempotencyKey === undefined
        ? {}
        : { headers: { 'Idempotency-Key': idempotencyKey } })
    });
    const output = await prepareBatch(ctx, response, false);
    return {
      output,
      message: `Submitted batch ${output.id} (${output.status}). Use get_batch to check progress.`
    };
  })
  .build();

export const listBatches = contextTool('list-batches')
  .output(batchListSchema)
  .handleInvocation(async ctx => {
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof batchListSchema>
    >('list batches', {
      method: 'GET',
      path: '/batch/list',
      query: ctx.input
    });
    const data = [];
    for (const batch of response.data) data.push(await prepareBatch(ctx, batch, false));
    const output = { ...response, data };
    return {
      output,
      message: `Listed ${output.data.length} batches${output.has_more ? '; continue with next_cursor' : ''}.`
    };
  })
  .build();

export const getBatch = contextTool('get-batch', {
  description:
    'Retrieve a batch’s status, progress, timing, credit accounting, and errors, plus downloadable result files after completion. Poll this after submit_batch; use get_batch_results to page through finished results.'
})
  .output(batchSchema)
  .handleInvocation(async ctx => {
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof batchSchema>
    >('get batch', {
      method: 'GET',
      path: `/batch/${pathId(ctx.input.batch_id)}`
    });
    const output = await prepareBatch(ctx, response, true);
    return { output, message: `Batch ${output.id} is ${output.status}.` };
  })
  .build();

export const getBatchResults = contextTool('get-batch-results')
  .output(resultsSchema)
  .handleInvocation(async ctx => {
    const { batch_id, ...query } = ctx.input;
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof resultsSchema>
    >('get batch results', {
      method: 'GET',
      path: `/batch/${pathId(batch_id)}/results`,
      query
    });
    const output = await deliverInlineImages(ctx, response);
    return {
      output,
      message: `Read ${output.data.length} results for batch ${batch_id}${output.has_more ? '; continue with next_cursor' : ''}.`
    };
  })
  .build();

export const cancelBatch = contextTool('cancel-batch')
  .output(batchSchema)
  .handleInvocation(async ctx => {
    const response = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof batchSchema>
    >('cancel batch', {
      method: 'POST',
      path: `/batch/${pathId(ctx.input.batch_id)}/cancel`
    });
    const output = await prepareBatch(ctx, response, false);
    return {
      output,
      message: `Requested cancellation of batch ${output.id}. Poll get_batch until it settles.`
    };
  })
  .build();

export const deleteBatch = contextTool('delete-batch')
  .output(deletedSchema)
  .handleInvocation(async ctx => {
    const output = await new ContextClient(ctx.auth.token).request<
      z.infer<typeof deletedSchema>
    >('delete batch', {
      method: 'DELETE',
      path: `/batch/${pathId(ctx.input.batch_id)}`
    });
    return { output, message: `Deleted batch ${output.id} and its stored results.` };
  })
  .build();

export const batchTools = [
  submitBatch,
  listBatches,
  getBatch,
  getBatchResults,
  cancelBatch,
  deleteBatch
];
