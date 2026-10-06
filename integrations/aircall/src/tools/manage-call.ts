import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exactId, fail, id, nativeCallId, numericCallId, row, text } from '../lib/contracts';
import { spec } from '../spec';

export let manageCall = SlateTool.create(spec, {
  name: 'Manage Call',
  key: 'manage_call',
  description: `Perform actions on a call: transfer to a user/team/number, add comments or tags, archive/unarchive, or control recording (pause/resume/delete). One action per request. Acknowledgement does not prove completion. Recording/voicemail deletion is delayed and irreversible; recording deletion also removes AI artifacts. Archive only toggles a legacy flag.`,
  instructions: [
    'Only one transfer target (userId, teamId, or external number) can be specified per transfer.',
    'Max 5 comments per call. Emojis in comments are stripped.',
    'Comments cannot be updated or deleted once posted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      callIdExact: z
        .string()
        .optional()
        .describe('Exact decimal Int64 ID from list_calls; supply instead of callId'),
      callId: z.number().optional().describe('The ID of the call to manage'),
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
      accepted: z.boolean().optional(),
      confirmed: z.boolean().optional(),
      pending: z.boolean().optional(),
      success: z.boolean().describe('Whether the action was successful'),
      callIdExact: z
        .string()
        .optional()
        .describe('Exact decimal Int64 ID from list_calls; supply instead of callId'),
      callId: z.number().optional().describe('The call ID that was managed'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    const callIdExact = exactId(ctx.input.callId, ctx.input.callIdExact),
      client = new Client(ctx.auth),
      action = ctx.input.action;
    let confirmed = false;
    let pending = false;
    const before = await client.getCall(callIdExact);
    switch (action) {
      case 'transfer':
        if (before.status === 'done') fail('Only ongoing calls can be transferred.');
        if (
          ctx.input.transferToNumber !== undefined &&
          (before.direction !== 'inbound' || before.answered_at != null)
        )
          fail('External transfers require an unanswered inbound call.');
        await client.transferCall(callIdExact, {
          userId: ctx.input.transferToUserId,
          teamId: ctx.input.transferToTeamId,
          number: ctx.input.transferToNumber,
          dispatchingStrategy: ctx.input.dispatchingStrategy
        });
        break;
      case 'comment':
        if (!Array.isArray(before.comments) || before.comments.length >= 5)
          fail(
            'Native call comments must be observable and below the five-comment limit. Comments cannot be undone.'
          );
        await client.commentOnCall(
          callIdExact,
          text(ctx.input.commentContent, 'commentContent')
        );
        break;
      case 'tag': {
        await client.tagCall(callIdExact, id(ctx.input.tagId, 'tagId'));
        const tagged = await client.getCall(callIdExact);
        confirmed =
          Array.isArray(tagged.tags) &&
          tagged.tags.some(v => id(row(v).id) === ctx.input.tagId);
        if (!confirmed)
          fail(
            'The tag request was acknowledged but current native state does not contain the tag.',
            'aircall_pending'
          );
        break;
      }
      case 'archive':
      case 'unarchive': {
        const receipt =
          action === 'archive'
            ? await client.archiveCall(callIdExact)
            : await client.unarchiveCall(callIdExact);
        if (nativeCallId(receipt.id) !== callIdExact)
          fail('Aircall returned another call after archive action.', 'aircall_receipt');
        const current = await client.getCall(callIdExact);
        confirmed = current.archived === (action === 'archive');
        if (!confirmed)
          fail(
            'The native archive flag is not yet in the requested state. Reconcile before retrying.',
            'aircall_pending'
          );
        break;
      }
      case 'pause_recording':
        await client.pauseRecording(callIdExact);
        break;
      case 'resume_recording':
        await client.resumeRecording(callIdExact);
        break;
      case 'delete_recording':
        await client.deleteRecording(callIdExact);
        pending = true;
        break;
      case 'delete_voicemail':
        await client.deleteVoicemail(callIdExact);
        pending = true;
        break;
    }
    return {
      output: {
        success: true,
        callId: numericCallId(callIdExact),
        callIdExact,
        action,
        accepted: true,
        confirmed,
        pending
      },
      message: pending
        ? 'Aircall acknowledged irreversible media deletion. Recording deletion takes 10–15 minutes and also removes AI artifacts; voicemail may take one minute. Assets can arrive up to 24 hours later, so this is not erasure proof.'
        : confirmed
          ? 'Verified the requested native call flag/tag. Archive only changes a legacy flag and does not close the Workspace conversation.'
          : 'Aircall acknowledged the action; completion is unconfirmed. Reconcile current call state before repeating retained or externally visible effects.'
    };
  })
  .build();
