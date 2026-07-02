import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let submitTranscriptionJob = SlateTool.create(spec, {
  name: 'Submit Transcription Job',
  key: 'submit_transcription_job',
  description: `Submits an audio/video file for asynchronous speech-to-text transcription. Provide a public media URL and configure options such as language, speaker diarization, profanity filtering, translation, and summarization.
Returns the created job with its ID and status. Poll the job status or use webhooks to know when it completes.`,
  instructions: [
    'Provide a publicly accessible media URL for the audio/video file.',
    'Use the transcriber field to select between "machine" (default Reverb ASR), "human", or "low_cost" (Reverb Turbo).',
    'Set language to an ISO 639-1 code (default: "en"). Use "cmn" for Mandarin Chinese.'
  ],
  constraints: [
    'Maximum file size is 2GB.',
    'Files are billed per second with a minimum charge of 15 seconds.',
    'Low-cost transcriber is only available for US deployment.',
    'Human transcription is only available for English.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaUrl: z.string().describe('Public URL of the audio/video file to transcribe'),
      language: z
        .string()
        .optional()
        .describe('ISO 639-1 language code (default: "en"). Use "cmn" for Mandarin.'),
      transcriber: z
        .enum(['machine', 'human', 'low_cost'])
        .optional()
        .describe(
          'Transcription engine: "machine" (default), "human", or "low_cost" (Reverb Turbo)'
        ),
      metadata: z
        .string()
        .optional()
        .describe('Optional metadata to associate with the job (max 512 chars)'),
      skipDiarization: z
        .boolean()
        .optional()
        .describe('Skip speaker diarization (default: false)'),
      skipPunctuation: z.boolean().optional().describe('Skip punctuation (default: false)'),
      filterProfanity: z
        .boolean()
        .optional()
        .describe('Filter profanity from results (default: false)'),
      removeDisfluencies: z
        .boolean()
        .optional()
        .describe('Remove filler words like "umm", "ah" (default: false)'),
      removeAtmospherics: z
        .boolean()
        .optional()
        .describe('Remove atmospherics like <laugh>, <affirmative> from output'),
      verbatim: z
        .boolean()
        .optional()
        .describe('Include every syllable including disfluencies and false starts'),
      skipPostprocessing: z
        .boolean()
        .optional()
        .describe('Skip inverse text normalization, casing, and punctuation steps'),
      speakerChannelsCount: z
        .number()
        .optional()
        .describe('Number of speaker channels (1-8) for multi-channel audio'),
      customVocabularyId: z
        .string()
        .optional()
        .describe('ID of a pre-compiled custom vocabulary to use'),
      customVocabularies: z
        .array(
          z.object({
            phrases: z.array(z.string()).describe('List of custom words or phrases')
          })
        )
        .optional()
        .describe('Inline custom vocabulary phrases for improving accuracy'),
      translationTargetLanguages: z
        .array(z.string())
        .optional()
        .describe('Target language codes to translate the transcript into'),
      enableSummarization: z.boolean().optional().describe('Enable transcript summarization'),
      deleteAfterSeconds: z
        .number()
        .optional()
        .describe('Auto-delete job after this many seconds (0-2592000)'),
      diarizationType: z
        .enum(['standard', 'premium'])
        .optional()
        .describe('Speaker diarization type'),
      expectedSpeakerCount: z
        .number()
        .optional()
        .describe('Expected number of speakers for better diarization')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique identifier for the transcription job'),
      status: z.string().describe('Job status: "in_progress", "transcribed", "failed"'),
      createdOn: z.string().describe('ISO 8601 timestamp when the job was created'),
      language: z.string().optional().describe('Language of the transcription'),
      transcriber: z.string().optional().describe('Transcriber used for the job'),
      metadata: z.string().optional().describe('Metadata associated with the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });

    let translationConfig = ctx.input.translationTargetLanguages?.length
      ? { targetLanguages: ctx.input.translationTargetLanguages }
      : undefined;

    let summarizationConfig = ctx.input.enableSummarization
      ? { type: 'paragraph' as const }
      : undefined;

    let diarizationConfig =
      ctx.input.diarizationType || ctx.input.expectedSpeakerCount
        ? {
            type: ctx.input.diarizationType,
            speakerCount: ctx.input.expectedSpeakerCount
          }
        : undefined;

    let job = await client.submitTranscriptionJob({
      mediaUrl: ctx.input.mediaUrl,
      language: ctx.input.language,
      transcriber: ctx.input.transcriber,
      metadata: ctx.input.metadata,
      skipDiarization: ctx.input.skipDiarization,
      skipPunctuation: ctx.input.skipPunctuation,
      filterProfanity: ctx.input.filterProfanity,
      removeDisfluencies: ctx.input.removeDisfluencies,
      removeAtmospherics: ctx.input.removeAtmospherics,
      verbatim: ctx.input.verbatim,
      skipPostprocessing: ctx.input.skipPostprocessing,
      speakerChannelsCount: ctx.input.speakerChannelsCount,
      customVocabularyId: ctx.input.customVocabularyId,
      customVocabularies: ctx.input.customVocabularies,
      translationConfig,
      summarizationConfig,
      deleteAfterSeconds: ctx.input.deleteAfterSeconds,
      diarizationConfig
    });

    return {
      output: {
        jobId: job.jobId,
        status: job.status,
        createdOn: job.createdOn,
        language: job.language,
        transcriber: job.transcriber,
        metadata: job.metadata
      },
      message: `Transcription job **${job.jobId}** submitted successfully with status **${job.status}**.`
    };
  })
  .build();
