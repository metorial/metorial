import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

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
      targetUserId: z.number().optional().describe('Dialpad user ID to call internally'),
      groupType: z
        .string()
        .optional()
        .describe('Group type for group calls (e.g., "department", "callcenter")'),
      groupId: z.number().optional().describe('Group ID for group calls'),
      customData: z.string().optional().describe('Custom data to attach to the call')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique call ID'),
      callState: z.string().optional().describe('Current state of the call'),
      isRecording: z.boolean().optional().describe('Whether the call is being recorded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let call = await client.initiateCall(ctx.input.callerUserId, {
      phone_number: ctx.input.phoneNumber,
      user_id: ctx.input.targetUserId,
      group_type: ctx.input.groupType,
      group_id: ctx.input.groupId,
      custom_data: ctx.input.customData
    });

    return {
      output: {
        callId: String(call.id),
        callState: call.call_state,
        isRecording: call.is_recording
      },
      message: `Initiated call **${call.id}** for user ${ctx.input.callerUserId}${ctx.input.phoneNumber ? ` to ${ctx.input.phoneNumber}` : ''}`
    };
  })
  .build();
