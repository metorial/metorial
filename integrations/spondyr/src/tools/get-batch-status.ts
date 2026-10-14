import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpondyrClient } from '../lib/client';
import { spec } from '../spec';

export let getBatchStatus = SlateTool.create(spec, {
  name: 'Get Batch Status',
  key: 'get_batch_status',
  description:
    'Check correspondence batch progress, processing totals, and item errors. Error reference IDs can be inspected with get_correspondence_status.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      referenceId: z
        .string()
        .describe('Batch reference ID returned by create_correspondence_batch')
    })
  )
  .output(
    z.object({
      referenceId: z.string().describe('Batch reference ID'),
      apiStatus: z.string().describe('API request result'),
      eventType: z.string().optional().describe('Event type for this batch'),
      generateOnly: z.boolean().optional().describe('Whether delivery was deferred'),
      statusCode: z.string().optional().describe('Batch processing status code'),
      statusName: z.string().optional().describe('Human-readable batch processing status'),
      createdDate: z.string().optional().describe('Date the batch was submitted'),
      batchSize: z.number().optional().describe('Number of submitted transactions'),
      totalProcessed: z.number().optional().describe('Number of processed transactions'),
      batchErrors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Item errors containing provider reference IDs, transaction indexes, and issue details'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpondyrClient(ctx.auth);
    let result = await client.getBatchStatus(ctx.input.referenceId);
    return {
      output: result,
      message: `Batch **${result.referenceId}** status: **${result.statusName ?? result.statusCode ?? result.apiStatus}**.`
    };
  })
  .build();
