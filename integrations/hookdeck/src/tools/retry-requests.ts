import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHookdeckInput, requireNonEmptyHookdeckRecord } from '../lib/errors';
import { spec } from '../spec';

export let retryRequests = SlateTool.create(spec, {
  name: 'Retry Requests',
  key: 'retry_requests',
  description: `Retry rejected Hookdeck requests individually or in bulk. Request retries re-run Hookdeck request processing and can create events for connections that existed when the original request was received.`,
  instructions: [
    'Use action "retry" with requestId to retry one rejected request.',
    'Use action "bulk_retry" with a non-empty query to retry matching rejected requests.',
    'Use plan_bulk_retry before bulk_retry when you need to estimate the affected requests.'
  ],
  constraints: [
    'Only rejected requests are eligible for retry.',
    'Requests rejected for unsupported method/content type, unparsable JSON, payload too large, or unknown fatal errors cannot be retried successfully.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'retry',
          'bulk_retry',
          'plan_bulk_retry',
          'get_bulk_retry',
          'cancel_bulk_retry'
        ])
        .describe('Action to perform'),
      requestId: z.string().optional().describe('Request ID (required for retry)'),
      query: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Non-empty filter query for bulk retry operations'),
      bulkRetryId: z
        .string()
        .optional()
        .describe('Bulk request retry ID (required for get_bulk_retry and cancel_bulk_retry)')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('Retried request ID'),
      bulkRetryId: z.string().optional().describe('Bulk retry operation ID'),
      result: z.unknown().optional().describe('Raw Hookdeck response for plan/get/cancel')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    switch (ctx.input.action) {
      case 'retry': {
        let requestId = requireHookdeckInput(ctx.input.requestId, 'requestId', 'retry');
        let result = await client.retryRequest(requestId);
        return {
          output: { requestId: result.id },
          message: `Retried request \`${result.id}\`.`
        };
      }
      case 'bulk_retry': {
        let query = requireNonEmptyHookdeckRecord(ctx.input.query, 'query', 'bulk_retry');
        let result = await client.bulkRetryRequests(query);
        return {
          output: { bulkRetryId: result.id },
          message: `Initiated bulk request retry \`${result.id}\`.`
        };
      }
      case 'plan_bulk_retry': {
        let query = requireNonEmptyHookdeckRecord(ctx.input.query, 'query', 'plan_bulk_retry');
        let result = await client.planBulkRetryRequests(query);
        return {
          output: { result },
          message: 'Prepared a bulk request retry plan.'
        };
      }
      case 'get_bulk_retry': {
        let bulkRetryId = requireHookdeckInput(
          ctx.input.bulkRetryId,
          'bulkRetryId',
          'get_bulk_retry'
        );
        let result = await client.getBulkRequestRetry(bulkRetryId);
        return {
          output: { bulkRetryId: result.id, result },
          message: `Retrieved bulk request retry \`${result.id}\`.`
        };
      }
      case 'cancel_bulk_retry': {
        let bulkRetryId = requireHookdeckInput(
          ctx.input.bulkRetryId,
          'bulkRetryId',
          'cancel_bulk_retry'
        );
        let result = await client.cancelBulkRequestRetry(bulkRetryId);
        return {
          output: { bulkRetryId: result.id, result },
          message: `Cancelled bulk request retry \`${result.id}\`.`
        };
      }
    }
  })
  .build();
