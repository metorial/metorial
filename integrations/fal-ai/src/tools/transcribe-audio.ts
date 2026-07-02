import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let transcribeAudio = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Transcribe audio files to text using Fal.ai speech recognition models like Whisper (Wizper).
Supports speaker diarization, language detection, and word/segment-level timestamps.
Provide an audio URL and receive a full transcription with optional metadata.`,
  instructions: [
    'Default model is "fal-ai/whisper". You can also use "fal-ai/wizper" or other transcription models.',
    'Provide the audio file as a publicly accessible URL or upload it first using the Upload File tool.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z
        .string()
        .optional()
        .describe('Model endpoint ID, defaults to "fal-ai/whisper"'),
      audioUrl: z.string().describe('URL of the audio file to transcribe'),
      language: z
        .string()
        .optional()
        .describe('Language code (e.g. "en", "fr") to hint the transcription language'),
      task: z
        .enum(['transcribe', 'translate'])
        .optional()
        .describe('Task to perform: transcribe in source language or translate to English'),
      diarize: z
        .boolean()
        .optional()
        .describe('Enable speaker diarization to identify different speakers'),
      chunkLevel: z
        .enum(['segment', 'word'])
        .optional()
        .describe('Level of timestamp chunking for the output'),
      numSpeakers: z
        .number()
        .optional()
        .describe('Expected number of speakers for diarization')
    })
  )
  .output(
    z.object({
      text: z.string().describe('Full transcribed text'),
      language: z.string().optional().describe('Detected or specified language'),
      chunks: z
        .array(
          z.object({
            text: z.string().describe('Transcribed text for this chunk'),
            timestamp: z
              .array(z.number())
              .optional()
              .describe('Start and end timestamps in seconds'),
            speaker: z.string().optional().describe('Speaker label if diarization is enabled')
          })
        )
        .optional()
        .describe('Transcription chunks with timestamps and optional speaker labels'),
      timings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Timing information for the transcription process')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);
    let modelId = ctx.input.modelId || 'fal-ai/whisper';

    let input: Record<string, any> = {
      audio_url: ctx.input.audioUrl
    };

    if (ctx.input.language) input.language = ctx.input.language;
    if (ctx.input.task) input.task = ctx.input.task;
    if (ctx.input.diarize !== undefined) input.diarize = ctx.input.diarize;
    if (ctx.input.chunkLevel) input.chunk_level = ctx.input.chunkLevel;
    if (ctx.input.numSpeakers !== undefined) input.num_speakers = ctx.input.numSpeakers;

    ctx.progress('Transcribing audio...');
    let result = await client.runModel(modelId, input);

    let chunks = (result.chunks || []).map((c: any) => ({
      text: c.text,
      timestamp: c.timestamp,
      speaker: c.speaker
    }));

    return {
      output: {
        text: result.text || '',
        language: result.language,
        chunks: chunks.length > 0 ? chunks : undefined,
        timings: result.timings
      },
      message: `Transcribed audio using **${modelId}**. Detected language: ${result.language || 'unknown'}. Text length: ${(result.text || '').length} characters.`
    };
  })
  .build();
