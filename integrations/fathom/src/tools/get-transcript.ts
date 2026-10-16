import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTranscriptEntry, transcriptEntrySchema } from '../lib/schemas';
import { spec } from '../spec';

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
    let client = new Client(ctx.auth);

    let data = await client.getTranscript(ctx.input.recordingId);

    let transcript = data.transcript.map(mapTranscriptEntry);

    return {
      output: { transcript },
      message: `Retrieved transcript with **${transcript.length}** entries for recording **${ctx.input.recordingId}**.`
    };
  })
  .build();
