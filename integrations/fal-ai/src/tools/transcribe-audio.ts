import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

const transcriptionSchema = z.object({
  text: z.string(),
  language: z.string().nullish(),
  inferred_languages: z.array(z.string()).nullish(),
  chunks: z
    .array(
      z.object({
        text: z.string(),
        timestamp: z.array(z.number().nullable()).nullish(),
        speaker: z.string().nullish()
      })
    )
    .nullish(),
  diarization_segments: z
    .array(z.object({ timestamp: z.array(z.number().nullable()), speaker: z.string() }))
    .nullish(),
  timings: z.record(z.string(), z.any()).nullish()
});

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
    readOnly: false
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
        .enum(['none', 'segment', 'word'])
        .optional()
        .describe('Level of timestamp chunking for the output'),
      numSpeakers: z
        .number()
        .int()
        .positive()
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
              .array(z.number().nullable())
              .optional()
              .describe('Start and end timestamps in seconds'),
            speaker: z.string().optional().describe('Speaker label if diarization is enabled')
          })
        )
        .optional()
        .describe('Transcription chunks with timestamps and optional speaker labels'),
      inferredLanguages: z
        .array(z.string())
        .optional()
        .describe('Languages inferred by the transcription model'),
      diarizationSegments: z
        .array(z.object({ timestamp: z.array(z.number().nullable()), speaker: z.string() }))
        .optional()
        .describe('Speaker segments when diarization is enabled'),
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

    const parsed = transcriptionSchema.safeParse(result);
    if (!parsed.success)
      throw createApiServiceError(
        'The selected model did not return a valid transcription. Inspect its output schema with search_models or use run_model for other output shapes.'
      );
    const transcription = parsed.data;
    let chunks = (transcription.chunks ?? []).map(c => ({
      text: c.text,
      timestamp: c.timestamp ?? undefined,
      speaker: c.speaker ?? undefined
    }));

    return {
      output: {
        text: transcription.text,
        language: transcription.language ?? transcription.inferred_languages?.[0],
        inferredLanguages: transcription.inferred_languages ?? undefined,
        diarizationSegments: transcription.diarization_segments ?? undefined,
        chunks: chunks.length > 0 ? chunks : undefined,
        timings: transcription.timings ?? undefined
      },
      message: `Transcribed audio using **${modelId}**. Detected language: ${transcription.language ?? transcription.inferred_languages?.[0] ?? 'unknown'}. Text length: ${transcription.text.length} characters.`
    };
  })
  .build();
