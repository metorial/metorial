import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';

export let moveMeetings = SlateTool.create(spec, {
  name: 'Move Meetings',
  key: 'move_meetings',
  description: `Move one to five meeting transcripts into a Fireflies channel. This replaces previous channel assignment and requires meeting ownership or team admin privileges.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      transcriptIds: z
        .array(z.string())
        .describe('Transcript IDs to move. Must contain 1 to 5 IDs.'),
      channelId: z.string().describe('Target channel ID')
    })
  )
  .output(
    z.object({
      meetings: z
        .array(
          z.object({
            transcriptId: z.string(),
            title: z.string().nullable(),
            channelIds: z.array(z.string()).nullable()
          })
        )
        .describe('Meetings returned by Fireflies after the move')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.transcriptIds.length < 1 || ctx.input.transcriptIds.length > 5) {
      throw firefliesServiceError('transcriptIds must contain between 1 and 5 IDs.');
    }
    if (new Set(ctx.input.transcriptIds).size !== ctx.input.transcriptIds.length) {
      throw firefliesServiceError('transcriptIds must not contain duplicates.');
    }
    if (!ctx.input.channelId.trim()) {
      throw firefliesServiceError('channelId is required.');
    }

    let client = new FirefliesClient({ token: ctx.auth.token });
    let result = await client.updateMeetingChannel(
      ctx.input.transcriptIds,
      ctx.input.channelId
    );
    let meetings = (result || []).map((meeting: any) => ({
      transcriptId: String(meeting?.id ?? ''),
      title: meeting?.title ?? null,
      channelIds: Array.isArray(meeting?.channels)
        ? meeting.channels.map((channel: any) => String(channel?.id ?? '')).filter(Boolean)
        : null
    }));

    return {
      output: { meetings },
      message: `Moved **${meetings.length}** meeting(s) to channel ${ctx.input.channelId}.`
    };
  })
  .build();
