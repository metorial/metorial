import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRecording = SlateTool.create(spec, {
  name: 'Delete Recording',
  key: 'delete_recording',
  description: `Delete cloud recordings for a meeting. Can delete all recordings for a meeting or a specific recording file. Supports moving to trash or permanent deletion.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('The meeting ID or UUID'),
      recordingFileId: z
        .string()
        .optional()
        .describe(
          'Specific recording file ID to delete. If omitted, all recordings for the meeting are deleted'
        ),
      action: z
        .enum(['trash', 'delete'])
        .default('trash')
        .describe(
          '"trash" moves to trash (recoverable for 30 days), "delete" permanently removes'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);

    if (ctx.input.recordingFileId) {
      await client.deleteRecordingFile(ctx.input.meetingId, ctx.input.recordingFileId, {
        action: ctx.input.action
      });
    } else {
      await client.deleteMeetingRecordings(ctx.input.meetingId, {
        action: ctx.input.action
      });
    }

    let actionDesc = ctx.input.action === 'trash' ? 'moved to trash' : 'permanently deleted';
    let targetDesc = ctx.input.recordingFileId
      ? `Recording file **${ctx.input.recordingFileId}**`
      : `All recordings for meeting **${ctx.input.meetingId}**`;

    return {
      output: { success: true },
      message: `${targetDesc} ${actionDesc}.`
    };
  })
  .build();
