import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  assertGenerationSucceeded,
  Client,
  getTranscript,
  isTranscriptionPending
} from '../lib/client';
import { spec } from '../spec';

export let speechToText = SlateTool.create(spec, {
  name: 'Speech to Text',
  key: 'speech_to_text',
  description: `Transcribe audio from a URL into text using speech-to-text models from OpenAI (Whisper), Deepgram (Nova-2), and Assembly AI.
Submits the audio for asynchronous processing and polls until the transcription is ready.
Generated transcriptions are stored on the server for 1 hour.`,
  instructions: [
    'Use model IDs like "#g1_whisper-large", "#g1_whisper-medium", "#g1_whisper-small".',
    'Provide a publicly accessible URL to the audio file.',
    'If the transcription is still processing, call get_transcription_result with its generationId.'
  ],
  constraints: [
    'Audio transcriptions are stored on the server for 1 hour from creation.',
    'Processing may take up to a few minutes depending on the audio length.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('STT model ID, e.g. "#g1_whisper-large", "#g1_whisper-medium"'),
      audioUrl: z.string().describe('Publicly accessible URL to the audio file to transcribe')
    })
  )
  .output(
    z.object({
      generationId: z.string().describe('Generation ID for the transcription task'),
      status: z
        .string()
        .describe('Status of the transcription (e.g. "completed", "waiting", "active")'),
      transcript: z.string().optional().describe('The transcribed text, if completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let createResult = await client.createSpeechToText({
      model: ctx.input.model,
      url: ctx.input.audioUrl
    });

    let generationId = createResult.generation_id;
    if (!generationId) {
      throw createApiServiceError(
        'AI/ML API returned no transcription generation ID. Try again.'
      );
    }
    let maxAttempts = 30;
    let pollIntervalMs = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let result = await client.getSpeechToTextResult(generationId);
      assertGenerationSucceeded(result, 'Transcription');

      if (!isTranscriptionPending(result.status)) {
        let transcript = getTranscript(result);
        if (result.status === 'completed' && transcript === undefined) {
          throw createApiServiceError(
            'AI/ML API reported a completed transcription without text. Try get_transcription_result.'
          );
        }

        return {
          output: {
            generationId,
            status: result.status,
            transcript: transcript ?? undefined
          },
          message: transcript
            ? `Transcription completed. Text: "${transcript.substring(0, 200)}${transcript.length > 200 ? '...' : ''}"`
            : `Transcription finished with status: ${result.status}`
        };
      }

      ctx.progress(`Transcription in progress (attempt ${attempt + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    return {
      output: {
        generationId,
        status: 'pending',
        transcript: undefined
      },
      message: `Transcription is still processing. Call get_transcription_result with generation ID \`${generationId}\` to check status later.`
    };
  })
  .build();
