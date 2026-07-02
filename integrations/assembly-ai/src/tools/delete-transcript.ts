import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTranscript = SlateTool.create(spec, {
  name: 'Delete Transcript',
  key: 'delete_transcript',
  description: `Delete a transcript by removing its data and marking it as deleted. The transcript resource itself remains but its data is permanently removed.
Any files uploaded via the upload endpoint are also immediately deleted alongside the transcript.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The unique ID of the transcript to delete.')
    })
  )
  .output(
    z.object({
      transcriptId: z.string().describe('The deleted transcript ID.'),
      status: z.string().describe('The transcript status after deletion.'),
      audioUrl: z.string().describe('The original audio URL.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.deleteTranscript(ctx.input.transcriptId);

    return {
      output: {
        transcriptId: result.id,
        status: result.status,
        audioUrl: result.audio_url
      },
      message: `Transcript **${result.id}** has been deleted. All associated data has been removed.`
    };
  })
  .build();
