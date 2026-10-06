import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
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
});

export let listCallsTool = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List completed calls in your Dialpad account. Filter by time range and target (user, call center, department, or office). Requires the **calls:list** scope.`,
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'list_calls');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
