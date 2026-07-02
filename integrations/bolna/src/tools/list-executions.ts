import { SlateTool } from 'slates';
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
      pageNumber: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Page size, max 50 (default: 20)'),
      status: z
        .enum([
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
      from: z.string().optional().describe('Start date filter (ISO 8601 UTC)'),
      to: z.string().optional().describe('End date filter (ISO 8601 UTC)')
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
      pageNumber: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    // If batchId without agentId, use batch executions endpoint
    if (input.batchId && !input.agentId) {
      let executions = await client.listBatchExecutions(input.batchId);
      let execList = Array.isArray(executions) ? executions : [];

      return {
        output: {
          executions: execList.map((e: any) => ({
            executionId: e.id,
            agentId: e.agent_id,
            status: e.status,
            transcript: e.transcript,
            conversationTime: e.conversation_time,
            totalCost: e.total_cost,
            createdAt: e.created_at,
            toNumber: e.telephony_data?.to_number,
            fromNumber: e.telephony_data?.from_number,
            callType: e.telephony_data?.call_type
          })),
          totalCount: execList.length,
          hasMore: false,
          pageNumber: 1
        },
        message: `Found **${execList.length}** execution(s) for batch \`${input.batchId}\`.`
      };
    }

    if (!input.agentId) {
      throw new Error('Either agentId or batchId is required');
    }

    let result = await client.listAgentExecutions(input.agentId, {
      pageNumber: input.pageNumber,
      pageSize: input.pageSize,
      status: input.status,
      callType: input.callType,
      provider: input.telephonyProvider,
      answeredByVoiceMail: input.answeredByVoiceMail,
      batchId: input.batchId,
      from: input.from,
      to: input.to
    });

    let executions = result.data || [];

    return {
      output: {
        executions: executions.map((e: any) => ({
          executionId: e.id,
          agentId: e.agent_id,
          status: e.status,
          transcript: e.transcript,
          conversationTime: e.conversation_time,
          totalCost: e.total_cost,
          createdAt: e.created_at,
          toNumber: e.telephony_data?.to_number,
          fromNumber: e.telephony_data?.from_number,
          callType: e.telephony_data?.call_type
        })),
        totalCount: result.total,
        hasMore: result.has_more,
        pageNumber: result.page_number
      },
      message: `Found **${result.total || executions.length}** execution(s) for agent \`${input.agentId}\`. Showing page ${result.page_number || 1} (${executions.length} results).`
    };
  })
  .build();
