import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let listCallsTool = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List calls in your Dialpad account. Filter by time range and target (user, call center, department, or office). Requires the **calls:list** scope.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp — only include calls started after this time'),
      startedBefore: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp — only include calls started before this time'),
      targetType: z
        .enum(['user', 'callcenter', 'department', 'office'])
        .optional()
        .describe('Target type to scope calls'),
      targetId: z.string().optional().describe('Target ID to scope calls'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      calls: z.array(
        z.object({
          callId: z.string().describe('Unique call ID'),
          callState: z.string().optional(),
          dateStarted: z.string().optional(),
          dateEnded: z.string().optional(),
          duration: z.number().optional().describe('Call duration in seconds'),
          direction: z.string().optional(),
          isRecording: z.boolean().optional(),
          callerNumber: z.string().optional(),
          calleeNumber: z.string().optional()
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let result = await client.listCalls({
      cursor: ctx.input.cursor,
      started_after: ctx.input.startedAfter,
      started_before: ctx.input.startedBefore,
      target_type: ctx.input.targetType,
      target_id: ctx.input.targetId
    });

    let calls = (result.items || []).map((c: any) => ({
      callId: String(c.id),
      callState: c.call_state || c.state,
      dateStarted: c.date_started,
      dateEnded: c.date_ended,
      duration: c.duration,
      direction: c.direction,
      isRecording: c.is_recording,
      callerNumber: c.caller_number || c.from_number,
      calleeNumber: c.callee_number || c.to_number
    }));

    return {
      output: {
        calls,
        nextCursor: result.cursor || undefined
      },
      message: `Found **${calls.length}** call(s)${result.cursor ? '. More results available.' : '.'}`
    };
  })
  .build();
