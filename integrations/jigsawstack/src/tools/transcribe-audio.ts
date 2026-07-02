import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let transcribeAudio = SlateTool.create(spec, {
  name: 'Transcribe Audio',
  key: 'transcribe_audio',
  description: `Transcribe audio or video files to text using AI speech-to-text. Supports speaker diarization, language detection, and translation. Provide a URL to an audio/video file or a file store key. For long files, the result is returned directly; alternatively a webhook URL can be used for asynchronous processing.`,
  instructions: [
    'Provide either a URL or file store key, not both.',
    'Enable bySpeaker to get speaker-separated transcripts.',
    'If processing is expected to take a long time, provide a webhookUrl to receive results asynchronously.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('URL of the audio or video file to transcribe'),
      fileStoreKey: z
        .string()
        .optional()
        .describe('File store key of a previously uploaded audio/video file'),
      language: z
        .string()
        .optional()
        .describe('Language code or "auto" for automatic detection'),
      translate: z
        .boolean()
        .optional()
        .describe('Translate the transcript to English (default: false)'),
      bySpeaker: z
        .boolean()
        .optional()
        .describe('Separate text by speaker (diarization) (default: false)'),
      webhookUrl: z
        .string()
        .optional()
        .describe(
          'Webhook URL for async processing - results will be POSTed there when ready'
        ),
      batchSize: z
        .number()
        .optional()
        .describe('Max chunks per response (default: 30, max: 40)'),
      chunkDuration: z
        .number()
        .optional()
        .describe('Duration per audio chunk in seconds (default: 3, max: 15)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      text: z.string().optional().describe('Complete transcription text'),
      chunks: z
        .array(
          z.object({
            text: z.string().optional(),
            timestamp: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Timestamped transcript segments'),
      speakers: z
        .array(
          z.object({
            speaker: z.string().optional(),
            text: z.string().optional(),
            timestamp: z.array(z.number()).optional()
          })
        )
        .optional()
        .describe('Speaker-separated transcripts (when bySpeaker is enabled)'),
      languageDetected: z.string().optional().describe('Detected language of the audio'),
      confidence: z.number().optional().describe('Language detection confidence score'),
      status: z
        .string()
        .optional()
        .describe('Processing status when webhook is used (e.g., "processing")'),
      jobId: z.string().optional().describe('Job ID for tracking async processing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.transcribeAudio({
      url: ctx.input.url,
      fileStoreKey: ctx.input.fileStoreKey,
      language: ctx.input.language,
      translate: ctx.input.translate,
      bySpeaker: ctx.input.bySpeaker,
      webhookUrl: ctx.input.webhookUrl,
      batchSize: ctx.input.batchSize,
      chunkDuration: ctx.input.chunkDuration
    });

    let isAsync = !!ctx.input.webhookUrl;

    return {
      output: {
        success: result.success ?? !isAsync,
        text: result.text,
        chunks: result.chunks,
        speakers: result.speakers,
        languageDetected: result.language_detected,
        confidence: result.confidence,
        status: result.status,
        jobId: result.id
      },
      message: isAsync
        ? `Transcription job **${result.id}** submitted for async processing. Results will be sent to the webhook URL.`
        : `Transcribed audio successfully.${result.language_detected ? ` Detected language: **${result.language_detected}**.` : ''} ${result.text ? `Transcription length: ${result.text.length} characters.` : ''}`
    };
  })
  .build();
