import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBatchStatus = SlateTool.create(spec, {
  name: 'Get Batch Status',
  key: 'get_batch_status',
  description: `Check the status of an asynchronous batch email verification job. Returns the current processing state, progress statistics, and timestamps. Use this to poll for completion after creating a batch verification.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      batchId: z.string().describe('The batch ID returned from creating a batch verification'),
      includeStats: z
        .boolean()
        .optional()
        .describe('Include detailed processing statistics breakdown')
    })
  )
  .output(
    z.object({
      batchId: z.string().describe('Batch identifier'),
      created: z.string().describe('ISO 8601 timestamp when the batch was created'),
      started: z.string().optional().describe('ISO 8601 timestamp when processing started'),
      completed: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when processing completed'),
      status: z.string().describe('Current status: processing or completed'),
      quantity: z.number().describe('Total number of emails in the batch'),
      duplicates: z.number().describe('Number of duplicate entries removed'),
      credits: z.number().optional().describe('Credits consumed (available after completion)'),
      processed: z.number().optional().describe('Number of emails processed so far'),
      stats: z
        .object({
          deliverable: z.number().describe('Count of deliverable emails'),
          risky: z.number().describe('Count of risky emails'),
          undeliverable: z.number().describe('Count of undeliverable emails'),
          unknown: z.number().describe('Count of unknown emails')
        })
        .optional()
        .describe('Breakdown of results by status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getBatchStatus(ctx.input.batchId, ctx.input.includeStats);

    let progressText =
      result.processed !== undefined
        ? ` (${result.processed}/${result.quantity} processed)`
        : '';

    return {
      output: result,
      message: `Batch **${result.batchId}**: status is **${result.status}**${progressText}`
    };
  })
  .build();
