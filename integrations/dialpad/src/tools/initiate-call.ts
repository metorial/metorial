import { SlateTool } from 'slates';
import { z } from 'zod';
import { malformed } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z.object({
  callId: z
    .string()
    .optional()
    .describe(
      'Call ID only when supplied by the provider; device initiation does not return one.'
    ),
  accepted: z
    .boolean()
    .describe('Whether the native device accepted initiation, without confirming connection.'),
  deviceId: z.string(),
  callerUserId: z.string(),
  callState: z.string().optional().describe('Current state of the call'),
  isRecording: z.boolean().optional().describe('Whether the call is being recorded')
});

export let initiateCallTool = SlateTool.create(spec, {
  name: 'Initiate Call',
  key: 'initiate_call',
  description: `Initiate an outbound call from a Dialpad user's application. The target user must have at least one active autocallable device (web or desktop Dialpad app, or CTI).`,
  constraints: [
    'Rate limited to 5 calls per minute.',
    'Mobile apps and physical deskphones are not supported as initiating devices.'
  ]
})
  .input(
    z.object({
      callerUserId: z.string().describe('User ID of the person making the call'),
      phoneNumber: z.string().optional().describe('Phone number to call (E.164 format)'),
      targetUserId: z
        .number()
        .optional()
        .describe(
          'Destination user ID; resolved only when the user has one unique phone number.'
        ),
      groupType: z
        .string()
        .optional()
        .describe(
          'Outbound caller identity group type: office, department or callcenter; not the destination.'
        ),
      groupId: z.number().optional().describe('Group ID for group calls'),
      customData: z.string().optional().describe('Custom data to attach to the call')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const result = await invoke(ctx, 'initiate_call');
    const output = outputSchema.safeParse(result.output);
    if (!output.success) malformed();
    return { output: output.data, message: result.message };
  })
  .build();
