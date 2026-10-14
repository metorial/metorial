import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, transcriptUrlRefreshIntervalMs } from '../lib/client';
import { spec } from '../spec';

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Transcript',
  key: 'get_transcript',
  description: `Provides a downloadable JSON transcription for a session. Transcription must have been enabled and finished processing. The download contains spoken text, timestamps, participant IDs, and breakout IDs.`,
  instructions: [
    'The search and page inputs are retained for compatibility; the current API returns the complete transcript file and does not apply these filters.'
  ],
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
      search: z
        .string()
        .optional()
        .describe(
          'Legacy input; the current API returns the complete transcript without filtering.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Legacy input; the current API returns the complete transcript without pagination.'
        )
    })
  )
  .output(
    z.object({
      transcript: z
        .unknown()
        .describe('Provider download metadata for the session transcript.'),
      sessionUuid: z.string().describe('UUID of the session whose transcript is provided.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let result = await client.getTranscript(ctx.input.sessionUuid);

    await ctx.addAttachment({
      type: 'url',
      url: result.transcriptionUrl,
      mimeType: 'application/json',
      refreshReference: { sessionUuid: ctx.input.sessionUuid },
      refreshAt: new Date(Date.now() + transcriptUrlRefreshIntervalMs).toISOString()
    });

    return {
      output: {
        transcript: result,
        sessionUuid: ctx.input.sessionUuid
      },
      message: `Transcript ready to download for session ${ctx.input.sessionUuid}.`
    };
  })
  .build();
