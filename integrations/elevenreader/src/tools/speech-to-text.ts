import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

export let speechToTextTool = SlateTool.create(spec, {
  name: 'Speech to Text',
  key: 'speech_to_text',
  description: `Transcribe spoken audio into text. Supports speaker diarization, word-level timestamps, and language detection. Provide audio as base64-encoded data or via a cloud storage URL.`,
  instructions: [
    'Provide either "audioBase64" or "cloudStorageUrl", not both.',
    'Enable "diarize" to identify different speakers in the audio.'
  ],
  constraints: ['File uploads must be under 3GB. Cloud storage URLs must be under 2GB.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      audioBase64: z.string().optional().describe('Base64-encoded audio file to transcribe'),
      cloudStorageUrl: z
        .string()
        .optional()
        .describe('HTTPS URL of the audio file in cloud storage'),
      fileName: z
        .string()
        .optional()
        .describe('Name of the audio file (used when providing base64 audio)'),
      modelId: z
        .enum(['scribe_v2', 'scribe_v1'])
        .optional()
        .describe('Transcription model to use. Defaults to "scribe_v2"'),
      languageCode: z.string().optional().describe('ISO 639-1/3 language code for the audio'),
      diarize: z
        .boolean()
        .optional()
        .describe('Enable speaker diarization to identify different speakers'),
      timestampsGranularity: z
        .enum(['none', 'word', 'character'])
        .optional()
        .describe('Level of timestamp detail in the transcription'),
      tagAudioEvents: z
        .boolean()
        .optional()
        .describe('Tag audio events like music, laughter, applause')
    })
  )
  .output(
    z.object({
      text: z.string().describe('Full transcribed text'),
      languageCode: z.string().optional().describe('Detected language code'),
      languageProbability: z.number().optional().describe('Confidence of language detection'),
      words: z
        .array(
          z.object({
            text: z.string().describe('Word text'),
            start: z.number().optional().describe('Start time in seconds'),
            end: z.number().optional().describe('End time in seconds'),
            speaker: z
              .string()
              .optional()
              .describe('Speaker identifier if diarization is enabled'),
            type: z.string().optional().describe('Type of word segment')
          })
        )
        .optional()
        .describe('Word-level transcription with timestamps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);

    let result = await client.speechToText({
      audioBase64: ctx.input.audioBase64,
      cloudStorageUrl: ctx.input.cloudStorageUrl,
      fileName: ctx.input.fileName,
      modelId: ctx.input.modelId,
      languageCode: ctx.input.languageCode,
      diarize: ctx.input.diarize,
      timestampsGranularity: ctx.input.timestampsGranularity,
      tagAudioEvents: ctx.input.tagAudioEvents
    });

    let wordCount = result.words?.length || 0;
    let textPreview = result.text?.substring(0, 100) || '';

    return {
      output: {
        text: result.text,
        languageCode: result.language_code,
        languageProbability: result.language_probability,
        words: result.words?.map((w: any) => ({
          text: w.text,
          start: w.start,
          end: w.end,
          speaker: w.speaker_id,
          type: w.type
        }))
      },
      message: `Transcribed audio to text (${wordCount} words). Language: ${result.language_code || 'auto-detected'}. Preview: "${textPreview}${result.text?.length > 100 ? '...' : ''}"`
    };
  })
  .build();
