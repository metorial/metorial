import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let manageCallTool = SlateTool.create(spec, {
  name: 'Manage Call',
  key: 'manage_call',
  description: `Perform actions on an active Dialpad call: hang up, transfer to another number or user, or toggle call recording.`,
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
        .describe('Transfer type (warm = announced, cold = direct)'),
      recordingEnabled: z
        .boolean()
        .optional()
        .describe('Whether to enable or disable recording (for toggle_recording action)')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('The call ID'),
      actionPerformed: z.string().describe('Action that was performed'),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let { action, callId } = ctx.input;

    if (action === 'hangup') {
      await client.hangupCall(callId);

      return {
        output: { callId, actionPerformed: 'hangup', success: true },
        message: `Hung up call **${callId}**`
      };
    }

    if (action === 'transfer') {
      await client.transferCall(callId, {
        phone_number: ctx.input.transferPhoneNumber,
        user_id: ctx.input.transferUserId,
        type: ctx.input.transferType
      });

      let target = ctx.input.transferPhoneNumber || `user ${ctx.input.transferUserId}`;
      return {
        output: { callId, actionPerformed: 'transfer', success: true },
        message: `Transferred call **${callId}** to ${target}`
      };
    }

    if (action === 'toggle_recording') {
      let enabled = ctx.input.recordingEnabled ?? true;
      await client.toggleCallRecording(callId, enabled);

      return {
        output: { callId, actionPerformed: 'toggle_recording', success: true },
        message: `${enabled ? 'Enabled' : 'Disabled'} recording on call **${callId}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
