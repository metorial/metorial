import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBatch = SlateTool.create(spec, {
  name: 'Manage Batch Sessions',
  key: 'manage_batch',
  description: `Create, list, get status, cancel, delete, or retry batch browser sessions. Batch sessions allow creating multiple browser sessions in a single operation (up to 1000), with progress tracking and retry capabilities.`,
  instructions: [
    'To create a batch, set action to "create" and provide count and optionally sessionConfig.',
    'To retry failed sessions in a batch, set action to "retry" and provide the batchId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'cancel', 'delete', 'retry'])
        .describe('Operation to perform'),
      batchId: z
        .string()
        .optional()
        .describe('Batch ID (required for get, cancel, delete, retry)'),
      count: z
        .number()
        .optional()
        .describe('Number of sessions to create in the batch (1-1000, for create)'),
      sessionConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Session configuration to apply to all batch sessions (for create)'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata for the batch (for create)'),
      page: z.number().optional().describe('Page number for listing batches'),
      limit: z.number().optional().describe('Items per page for listing'),
      retryFailedOnly: z
        .boolean()
        .optional()
        .describe('Only retry failed sessions (default: true)'),
      maxRetries: z
        .number()
        .optional()
        .describe('Maximum retries per session (1-3, default: 1)')
    })
  )
  .output(
    z.object({
      batchId: z.string().optional(),
      status: z.string().optional(),
      totalRequests: z.number().optional(),
      completedRequests: z.number().optional(),
      failedRequests: z.number().optional(),
      createdAt: z.string().optional(),
      batches: z
        .array(
          z.object({
            batchId: z.string(),
            status: z.string(),
            totalRequests: z.number(),
            completedRequests: z.number(),
            failedRequests: z.number(),
            createdAt: z.string()
          })
        )
        .optional(),
      sessions: z
        .array(
          z.object({
            sessionId: z.string(),
            status: z.string(),
            cdpUrl: z.string().optional(),
            liveViewUrl: z.string().optional(),
            error: z.string().optional()
          })
        )
        .optional(),
      progress: z
        .object({
          percentage: z.number(),
          currentPhase: z.string()
        })
        .optional(),
      deleted: z.boolean().optional(),
      retriedSessions: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'create') {
      if (!input.count) throw new Error('count is required for create.');
      let result = await client.createBatch({
        count: input.count,
        configuration: input.sessionConfig as any,
        metadata: input.metadata
      });
      return {
        output: {
          batchId: result.batch_id,
          status: result.status,
          totalRequests: result.total_requests,
          createdAt: result.created_at
        },
        message: `Created batch **${result.batch_id}** with **${result.total_requests}** sessions.`
      };
    }

    if (input.action === 'list') {
      let result = await client.listBatches({ page: input.page, limit: input.limit });
      return {
        output: {
          batches: (result.batches ?? []).map(b => ({
            batchId: b.batch_id,
            status: b.status,
            totalRequests: b.total_requests,
            completedRequests: b.completed_requests,
            failedRequests: b.failed_requests,
            createdAt: b.created_at
          }))
        },
        message: `Found **${(result.batches ?? []).length}** batches.`
      };
    }

    if (input.action === 'get') {
      if (!input.batchId) throw new Error('batchId is required for get.');
      let result = await client.getBatch(input.batchId);
      return {
        output: {
          batchId: result.batch_id,
          status: result.status,
          totalRequests: result.total_requests,
          completedRequests: result.completed_requests,
          failedRequests: result.failed_requests,
          createdAt: result.created_at,
          sessions: (result.sessions ?? []).map(s => ({
            sessionId: s.session_id,
            status: s.status,
            cdpUrl: s.cdp_url,
            liveViewUrl: s.live_view_url,
            error: s.error
          })),
          progress: result.progress
            ? {
                percentage: result.progress.percentage,
                currentPhase: result.progress.current_phase
              }
            : undefined
        },
        message: `Batch **${result.batch_id}**: ${result.completed_requests}/${result.total_requests} completed, ${result.failed_requests} failed (${result.progress?.percentage ?? 0}%).`
      };
    }

    if (input.action === 'cancel') {
      if (!input.batchId) throw new Error('batchId is required for cancel.');
      let _result = await client.cancelBatch(input.batchId);
      return {
        output: {
          batchId: input.batchId,
          status: 'cancelled'
        },
        message: `Batch **${input.batchId}** has been cancelled.`
      };
    }

    if (input.action === 'delete') {
      if (!input.batchId) throw new Error('batchId is required for delete.');
      await client.deleteBatch(input.batchId);
      return {
        output: { deleted: true },
        message: `Batch **${input.batchId}** has been deleted.`
      };
    }

    if (input.action === 'retry') {
      if (!input.batchId) throw new Error('batchId is required for retry.');
      let result = await client.retryBatch(input.batchId, {
        retryFailedOnly: input.retryFailedOnly,
        maxRetries: input.maxRetries
      });
      return {
        output: {
          batchId: input.batchId,
          retriedSessions: (result as any)?.retried_sessions,
          status: (result as any)?.status
        },
        message: `Retrying failed sessions in batch **${input.batchId}**.`
      };
    }

    throw new Error(`Unknown action: ${input.action}`);
  })
  .build();
