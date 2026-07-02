import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCall = SlateTool.create(spec, {
  name: 'Manage Call',
  key: 'manage_call',
  description: `Perform actions on a call: transfer to a user/team/number, add comments or tags, archive/unarchive, or control recording (pause/resume/delete). Combine multiple actions in a single operation.`,
  instructions: [
    'Only one transfer target (userId, teamId, or external number) can be specified per transfer.',
    'Max 5 comments per call. Emojis in comments are stripped.',
    'Comments cannot be updated or deleted once posted.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      callId: z.number().describe('The ID of the call to manage'),
      action: z
        .enum([
          'transfer',
          'comment',
          'tag',
          'archive',
          'unarchive',
          'pause_recording',
          'resume_recording',
          'delete_recording',
          'delete_voicemail'
        ])
        .describe('The action to perform on the call'),
      transferToUserId: z
        .number()
        .optional()
        .describe('User ID to transfer the call to (for transfer action)'),
      transferToTeamId: z
        .number()
        .optional()
        .describe('Team ID to transfer the call to (for transfer action)'),
      transferToNumber: z
        .string()
        .optional()
        .describe(
          'External phone number to transfer the call to in E.164 format (for transfer action)'
        ),
      dispatchingStrategy: z
        .enum(['simultaneous', 'random', 'longest_idle'])
        .optional()
        .describe('Strategy for team transfers (default: simultaneous)'),
      commentContent: z
        .string()
        .optional()
        .describe('Comment text to add to the call (for comment action)'),
      tagId: z.number().optional().describe('Tag ID to apply to the call (for tag action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      callId: z.number().describe('The call ID that was managed'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { callId, action } = ctx.input;

    switch (action) {
      case 'transfer':
        await client.transferCall(callId, {
          userId: ctx.input.transferToUserId,
          teamId: ctx.input.transferToTeamId,
          number: ctx.input.transferToNumber,
          dispatchingStrategy: ctx.input.dispatchingStrategy
        });
        break;

      case 'comment':
        if (!ctx.input.commentContent) {
          throw new Error('commentContent is required for comment action');
        }
        await client.commentOnCall(callId, ctx.input.commentContent);
        break;

      case 'tag':
        if (!ctx.input.tagId) {
          throw new Error('tagId is required for tag action');
        }
        await client.tagCall(callId, ctx.input.tagId);
        break;

      case 'archive':
        await client.archiveCall(callId);
        break;

      case 'unarchive':
        await client.unarchiveCall(callId);
        break;

      case 'pause_recording':
        await client.pauseRecording(callId);
        break;

      case 'resume_recording':
        await client.resumeRecording(callId);
        break;

      case 'delete_recording':
        await client.deleteRecording(callId);
        break;

      case 'delete_voicemail':
        await client.deleteVoicemail(callId);
        break;
    }

    return {
      output: {
        success: true,
        callId,
        action
      },
      message: `Successfully performed **${action}** on call **#${callId}**.`
    };
  })
  .build();
