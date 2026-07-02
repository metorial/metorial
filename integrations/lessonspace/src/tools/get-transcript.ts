import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Transcript',
  key: 'get_transcript',
  description: `Retrieves the transcription for a session. Transcription must have been enabled when the space was launched via the \`transcribe\` flag. Supports search and pagination for navigating long transcripts.`,
  constraints: [
    'Transcription must have been scheduled on the session via the Launch endpoint.',
    'Transcription processing may take some time after a session ends.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sessionUuid: z.string().describe('UUID of the session to get the transcript for.'),
      search: z.string().optional().describe('Search term to filter the transcript content.'),
      page: z.number().optional().describe('Page number for paginated results.')
    })
  )
  .output(
    z.object({
      transcript: z.any().describe('The transcript data for the session.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organisationId: ctx.config.organisationId
    });

    let result = await client.getTranscript(ctx.input.sessionUuid, {
      search: ctx.input.search,
      page: ctx.input.page
    });

    return {
      output: {
        transcript: result
      },
      message: `Transcript retrieved for session ${ctx.input.sessionUuid}.`
    };
  })
  .build();
