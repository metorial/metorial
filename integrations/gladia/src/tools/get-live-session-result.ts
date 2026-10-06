import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapTranscription, transcriptionOutputSchema } from '../lib/results';
import { spec } from '../spec';

export let getLiveSessionResult = SlateTool.create(spec, {
  name: 'Get Live Session Result',
  key: 'get_live_session_result',
  description: `Retrieve the status and results of a live transcription session, including its transcript, speaker timestamps, translation, summarization, entities, and sentiment analysis.`,
  instructions: [
    'Use the session ID returned from Initiate Live Session.',
    'Results are only available after the session has ended and post-processing is complete.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('ID of the live session to retrieve results for')
    })
  )
  .output(
    transcriptionOutputSchema
      .omit({ transcriptionId: true, subtitles: true, subtitleFiles: true })
      .extend({ sessionId: z.string() })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLiveSessionResult(ctx.input.sessionId);

    let { transcriptionId, ...mapped } = mapTranscription(result);
    return {
      output: { sessionId: transcriptionId, ...mapped },
      message: `Live session ${result.id} is **${result.status}**${result.status === 'error' ? ` (error code ${result.error_code ?? 'unknown'})` : ''}.`
    };
  })
  .build();
