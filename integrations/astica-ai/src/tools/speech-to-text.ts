import { SlateTool } from 'slates';
import { z } from 'zod';
import { AsticaListenClient } from '../lib/client';
import { spec } from '../spec';

export let speechToTextTool = SlateTool.create(spec, {
  name: 'Speech to Text',
  key: 'speech_to_text',
  description: `Transcribe audio to text using Astica's hearing AI. Converts spoken words from audio files into written text with high accuracy and multilingual support.
Accepts audio via HTTPS URL or Base64-encoded string in WAV or MP3 format.`,
  instructions: [
    'Provide audio as an HTTPS URL or Base64-encoded string.',
    'Supported audio formats are .wav and .mp3.'
  ],
  constraints: ['Only WAV and MP3 audio formats are supported.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      audioInput: z
        .string()
        .describe('HTTPS URL or Base64-encoded string of the audio file (.wav or .mp3)'),
      modelVersion: z
        .enum(['1.0_full', '2.0_full'])
        .optional()
        .describe('Model version. Defaults to 1.0_full.'),
      lowPriority: z.boolean().optional().describe('Use low-priority mode for lower cost')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      transcription: z.string().optional().describe('Transcribed text from the audio'),
      rawResponse: z.any().optional().describe('Full raw response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AsticaListenClient(ctx.auth.token);

    ctx.info('Transcribing audio to text');

    let result = await client.transcribe({
      audioInput: ctx.input.audioInput,
      modelVersion: ctx.input.modelVersion,
      lowPriority: ctx.input.lowPriority ? 1 : 0
    });

    let transcription = result.output || result.text || result.transcription || '';

    return {
      output: {
        status: result.status || 'unknown',
        transcription,
        rawResponse: result
      },
      message: transcription
        ? `Transcription completed: "${transcription.substring(0, 200)}${transcription.length > 200 ? '...' : ''}"`
        : `Transcription completed. Status: ${result.status || 'unknown'}.`
    };
  })
  .build();
