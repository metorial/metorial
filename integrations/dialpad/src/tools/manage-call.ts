import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  callId: z.string().describe('The call ID'),
  actionPerformed: z.string().describe('Action that was performed'),
  success: z.boolean(),
  accepted: z.boolean(),
  transferCallId: z.string().optional(),
  transferredToNumber: z.string().optional(),
  transferredToState: z.string().optional()
});

export let manageCallTool = SlateTool.create(spec, {
  name: 'Manage Call',
  key: 'manage_call',
  description: `Perform actions on an active Dialpad call: hang up, transfer to another number or user, with native request receipts. Recording changes cannot be bound to this call-ID contract and are explicitly refused.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['hangup', 'transfer', 'toggle_recording'])
        .describe('Action to perform on the call'),
      callId: z.string().describe('The call ID to act on'),
      transferPhoneNumber: z
        .string()
        .optional()
        .describe('Phone number to transfer to (for transfer action)'),
      transferUserId: z
        .number()
        .optional()
        .describe('User ID to transfer to (for transfer action)'),
      transferType: z
        .enum(['warm', 'cold'])
        .optional()
        .describe(
          'Legacy selector preserved; current endpoint has no warm/cold option. Omit it for a native transfer.'
        ),
      recordingEnabled: z
        .boolean()
        .optional()
        .describe(
          'Legacy field preserved; toggle_recording is refused because the current user-active-call API cannot bind callId.'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'manage_call');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
