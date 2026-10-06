import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExecutions = SlateTool.create(spec, {
  name: 'List Executions',
  key: 'list_executions',
  description: `List call executions for an agent or batch with filtering by status, call type, date range, and pagination. Returns transcripts, costs, and telephony metadata for each call.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().optional().describe('Agent ID to list executions for'),
      batchId: z
        .string()
        .optional()
        .describe(
          'Batch ID to list executions for (can be used alone or with agentId as a filter)'
        ),
      pageNumber: z.number().int().min(1).optional().describe('Page number (default: 1)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Page size, max 50 (default: 20)'),
      status: z
        .enum([
          'scheduled',
          'rescheduled',
          'queued',
          'ringing',
          'initiated',
          'in-progress',
          'call-disconnected',
          'completed',
          'balance-low',
          'busy',
          'no-answer',
          'canceled',
          'failed',
          'stopped',
          'error'
        ])
        .optional()
        .describe('Filter by call status'),
      callType: z.enum(['inbound', 'outbound']).optional().describe('Filter by call type'),
      telephonyProvider: z
        .enum(['plivo', 'twilio', 'websocket', 'web-call'])
        .optional()
        .describe('Filter by telephony provider'),
      answeredByVoiceMail: z.boolean().optional().describe('Filter by voicemail detection'),
      from: z
        .string()
        .optional()
        .describe(
          'Start date in UTC; provide with to, at most seven days apart. Defaults to the last seven days.'
        ),
      to: z
        .string()
        .optional()
        .describe('End date in UTC; provide with from, at most seven days apart.')
    })
  )
  .output(
    z.object({
      executions: z
        .array(
          z.object({
            executionId: z.string().describe('Execution ID'),
            agentId: z.string().optional(),
            status: z.string().optional(),
            transcript: z.string().optional(),
            conversationTime: z.number().optional(),
            totalCost: z.number().optional(),
            createdAt: z.string().optional(),
            toNumber: z.string().optional(),
            fromNumber: z.string().optional(),
            callType: z.string().optional()
          })
        )
        .describe('List of call executions'),
      totalCount: z.number().optional().describe('Total number of matching executions'),
      hasMore: z.boolean().optional().describe('Whether more pages are available'),
      pageNumber: z.number().int().min(1).optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    if (!input.agentId && !input.batchId) {
      throw createApiServiceError('Either agentId or batchId is required');
    }
    if (
      !input.agentId &&
      (input.status ||
        input.callType ||
        input.telephonyProvider ||
        input.answeredByVoiceMail !== undefined ||
        input.from ||
        input.to)
    ) {
      throw createApiServiceError(
        'Batch-only execution listing supports pageNumber and pageSize. Provide agentId to use filters.'
      );
    }
    if ((input.from !== undefined) !== (input.to !== undefined)) {
      throw createApiServiceError(
        'Provide from and to together, in UTC, at most seven days apart.'
      );
    }
    let to = input.to ?? new Date().toISOString();
    let from = input.from ?? new Date(Date.parse(to) - 7 * 86400000).toISOString();
    let startTime = Date.parse(from);
    let endTime = Date.parse(to);
    if (
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      !from.endsWith('Z') ||
      !to.endsWith('Z') ||
      endTime < startTime ||
      endTime - startTime > 7 * 86400000
    ) {
      throw createApiServiceError(
        'from and to must be UTC ISO 8601 timestamps ending in Z, with a range of zero to seven days.'
      );
    }

    let result = input.agentId
      ? await client.listAgentExecutions(input.agentId, {
          pageNumber: input.pageNumber,
          pageSize: input.pageSize,
          status: input.status,
          callType: input.callType,
          provider: input.telephonyProvider,
          answeredByVoiceMail: input.answeredByVoiceMail,
          batchId: input.batchId,
          from,
          to
        })
      : await client.listBatchExecutions(input.batchId!, input.pageNumber, input.pageSize);

    let executions = result.data || [];

    return {
      output: {
        executions: executions.map((e: any) => ({
          executionId: e.id,
          agentId: e.agent_id ?? undefined,
          status: e.status ?? undefined,
          transcript: e.transcript ?? undefined,
          conversationTime: e.conversation_duration ?? e.conversation_time ?? undefined,
          totalCost: e.total_cost ?? undefined,
          createdAt: e.created_at ?? undefined,
          toNumber: e.telephony_data?.to_number ?? undefined,
          fromNumber: e.telephony_data?.from_number ?? undefined,
          callType: e.telephony_data?.call_type ?? undefined
        })),
        totalCount: result.total,
        hasMore: result.has_more,
        pageNumber: result.page_number
      },
      message: `Found **${result.total || executions.length}** execution(s) for ${input.agentId ? 'agent' : 'batch'} \`${input.agentId ?? input.batchId}\`. Showing page ${result.page_number || 1} (${executions.length} results).`
    };
  })
  .build();
