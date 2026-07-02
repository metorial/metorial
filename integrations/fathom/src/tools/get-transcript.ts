import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transcriptEntrySchema = z.object({
  speakerName: z.string().describe('Display name of the speaker'),
  speakerEmail: z
    .string()
    .nullable()
    .describe('Matched calendar invitee email of the speaker'),
  text: z.string().describe('Spoken text'),
  timestamp: z.string().describe('Timestamp in HH:MM:SS format')
});

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Transcript',
  key: 'get_transcript',
  description: `Retrieve the full speaker-labeled, timestamped transcript for a specific meeting recording. Each entry includes the speaker name, matched email, spoken text, and timestamp.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordingId: z
        .number()
        .describe('The recording ID of the meeting to get the transcript for')
    })
  )
  .output(
    z.object({
      transcript: z.array(transcriptEntrySchema).describe('Speaker-labeled transcript entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getTranscript(ctx.input.recordingId);

    let transcript = (data.transcript || []).map(entry => ({
      speakerName: entry.speaker.display_name,
      speakerEmail: entry.speaker.matched_calendar_invitee_email,
      text: entry.text,
      timestamp: entry.timestamp
    }));

    return {
      output: { transcript },
      message: `Retrieved transcript with **${transcript.length}** entries for recording **${ctx.input.recordingId}**.`
    };
  })
  .build();
