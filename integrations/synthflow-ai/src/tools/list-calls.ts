import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List call history for a specific agent. Supports filtering by date range, call status, duration, and lead phone number. Returns call metadata with pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      agentId: z.string().describe('The model ID of the agent to list calls for'),
      limit: z.number().optional().describe('Number of calls per page (default: 20)'),
      offset: z.number().optional().describe('Starting index for pagination'),
      fromDate: z.number().optional().describe('Start timestamp in milliseconds'),
      toDate: z.number().optional().describe('End timestamp in milliseconds'),
      callStatus: z
        .string()
        .optional()
        .describe('Filter by call status (e.g., "completed", "busy", "failed", "no-answer")'),
      durationMin: z.number().optional().describe('Minimum call duration in seconds'),
      durationMax: z.number().optional().describe('Maximum call duration in seconds'),
      leadPhoneNumber: z
        .string()
        .optional()
        .describe('Filter by lead phone number (E.164 format)')
    })
  )
  .output(
    z.object({
      calls: z.array(z.record(z.string(), z.any())).describe('List of call records'),
      pagination: z
        .object({
          totalRecords: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional()
        })
        .optional()
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCalls({
      model_id: ctx.input.agentId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      from_date: ctx.input.fromDate,
      to_date: ctx.input.toDate,
      call_status: ctx.input.callStatus,
      duration_min: ctx.input.durationMin,
      duration_max: ctx.input.durationMax,
      lead_phone_number: ctx.input.leadPhoneNumber
    });
    let response = result.response || {};
    let calls = response.calls || [];
    let pagination = response.pagination;

    return {
      output: {
        calls,
        pagination: pagination
          ? {
              totalRecords: pagination.total_records,
              limit: pagination.limit,
              offset: pagination.offset
            }
          : undefined
      },
      message: `Found ${calls.length} call(s) for agent \`${ctx.input.agentId}\`.`
    };
  })
  .build();
