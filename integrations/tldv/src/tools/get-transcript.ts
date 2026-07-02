import { SlateTool } from 'slates';
import { z } from 'zod';
import { TldvClient } from '../lib/client';
import { spec } from '../spec';

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Transcript',
  key: 'get_transcript',
  description: `Retrieve the full transcript of a meeting. Returns speaker-attributed text segments with start and end timestamps. The transcript is only available after processing is complete.`,
  constraints: ['Transcripts are only available once meeting processing is complete.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z
        .string()
        .describe('The unique identifier of the meeting whose transcript to retrieve.')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('Unique transcript identifier.'),
      meetingId: z.string().describe('The meeting this transcript belongs to.'),
      segments: z
        .array(
          z.object({
            speaker: z.string().describe('Name of the speaker.'),
            text: z.string().describe('Transcribed text content.'),
            startTime: z.number().describe('Start time of the segment in seconds.'),
            endTime: z.number().describe('End time of the segment in seconds.')
          })
        )
        .describe('Transcript segments with speaker attribution and timestamps.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TldvClient({ token: ctx.auth.token });
    let transcript = await client.getTranscript(ctx.input.meetingId);

    let segments = (transcript.data ?? []).map(s => ({
      speaker: s.speaker,
      text: s.text,
      startTime: s.startTime,
      endTime: s.endTime
    }));

    return {
      output: {
        transcriptId: transcript.id,
        meetingId: transcript.meetingId,
        segments
      },
      message: `Retrieved transcript with **${segments.length}** segment(s) for meeting \`${ctx.input.meetingId}\`.`
    };
  })
  .build();
