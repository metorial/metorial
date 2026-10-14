import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { assertGenerationSucceeded, Client, getTranscript } from '../lib/client';
import { spec } from '../spec';

export let getTranscriptionResult = SlateTool.create(spec, {
  name: 'Get Transcription Result',
  key: 'get_transcription_result',
  description:
    'Check an existing speech-to-text task and retrieve its transcript. Use the generationId returned by speech_to_text. Results are retained by the provider for one hour.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      generationId: z.string().min(1).describe('Generation ID returned by speech_to_text')
    })
  )
  .output(
    z.object({
      generationId: z.string(),
      status: z.string(),
      transcript: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.getSpeechToTextResult(ctx.input.generationId);
    assertGenerationSucceeded(result, 'Transcription');
    let transcript = getTranscript(result);
    if (result.status === 'completed' && transcript === undefined) {
      throw createApiServiceError(
        'AI/ML API reported a completed transcription without text. Try retrieving the result again.'
      );
    }
    return {
      output: { generationId: ctx.input.generationId, status: result.status, transcript },
      message: `Transcription status: **${result.status}**.`
    };
  })
  .build();
