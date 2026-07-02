import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List voice calls in your Vapi account. Filter by assistant, phone number, or timestamps. Returns call metadata including status, type, duration, and costs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of calls to return (default 100)'),
      assistantId: z.string().optional().describe('Filter calls by assistant ID'),
      phoneNumberId: z.string().optional().describe('Filter calls by phone number ID'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter for calls created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter for calls created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter for calls updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Filter for calls updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      calls: z
        .array(
          z.object({
            callId: z.string().describe('ID of the call'),
            type: z.string().optional().describe('Call type'),
            status: z.string().optional().describe('Call status'),
            assistantId: z.string().optional().describe('Assistant ID used'),
            phoneNumberId: z.string().optional().describe('Phone number ID used'),
            startedAt: z.string().optional().describe('Call start timestamp'),
            endedAt: z.string().optional().describe('Call end timestamp'),
            endedReason: z.string().optional().describe('Reason the call ended'),
            duration: z.number().optional().describe('Call duration in seconds'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of calls'),
      count: z.number().describe('Number of calls returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.assistantId) params.assistantId = ctx.input.assistantId;
    if (ctx.input.phoneNumberId) params.phoneNumberId = ctx.input.phoneNumberId;
    if (ctx.input.createdAfter) params.createdAtGt = ctx.input.createdAfter;
    if (ctx.input.createdBefore) params.createdAtLt = ctx.input.createdBefore;
    if (ctx.input.updatedAfter) params.updatedAtGt = ctx.input.updatedAfter;
    if (ctx.input.updatedBefore) params.updatedAtLt = ctx.input.updatedBefore;

    let calls = await client.listCalls(params);

    return {
      output: {
        calls: calls.map((c: any) => ({
          callId: c.id,
          type: c.type,
          status: c.status,
          assistantId: c.assistantId,
          phoneNumberId: c.phoneNumberId,
          startedAt: c.startedAt,
          endedAt: c.endedAt,
          endedReason: c.endedReason,
          duration: c.duration,
          createdAt: c.createdAt
        })),
        count: calls.length
      },
      message: `Found **${calls.length}** call(s).`
    };
  })
  .build();
