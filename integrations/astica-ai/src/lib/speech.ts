import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export let speechOutputSchema = z.object({
  status: z.string().describe('Response status'),
  engine: z.string().optional().describe('Voice engine used'),
  voice: z.string().optional().describe('Voice identifier used'),
  audioBase64: z.string().optional().describe('Base64-encoded WAV audio data'),
  audioFormat: z.string().optional().describe('Audio format (e.g., "wav")'),
  costUnits: z.number().optional().describe('API usage cost units'),
  timestamps: z
    .array(
      z.object({
        text: z.string(),
        startSeconds: z.number(),
        stopSeconds: z.number()
      })
    )
    .optional()
    .describe('Word-level timestamps'),
  taskId: z.string().optional().describe('Queued speech task ID for get_speech_task'),
  taskStatus: z
    .number()
    .optional()
    .describe('Task state: 0 pending, 1 complete, 2 cancelled, 3 failed')
});

export let mapSpeechResult = (result: any): z.infer<typeof speechOutputSchema> => {
  let audio = isApiErrorRecord(result.result) ? result.result : result;
  return {
    status: result.status || 'unknown',
    engine: audio.engine ?? result.engine,
    voice: audio.voice ?? result.voice,
    audioBase64: audio.audio_b64,
    audioFormat: audio.audio_format,
    costUnits: audio.cost_units ?? result.cost_units,
    timestamps: audio.meta?.timestamps?.map((timestamp: any) => ({
      text: timestamp.text,
      startSeconds: timestamp.start_s,
      stopSeconds: timestamp.stop_s
    })),
    taskId: result.task_id,
    taskStatus: result.task_status
  };
};

export let getSpeechAudio = (output: z.infer<typeof speechOutputSchema>) => {
  if (!output.audioBase64) {
    if (output.status === 'success') {
      throw createApiServiceError(
        'Astica completed the speech request without returning audio.'
      );
    }
    return undefined;
  }

  let bytes = Buffer.from(output.audioBase64, 'base64');
  if (!bytes.length) {
    throw createApiServiceError('Astica returned empty or invalid speech audio.');
  }
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'audio/wav' }
  });
};
